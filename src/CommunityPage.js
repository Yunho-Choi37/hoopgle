import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from './firebaseConfig';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import SignUpPage from './SignUpPage';
import './CommunityPage.css';

const CommunityPage = ({ onGoBack }) => {
  const [activeChannel, setActiveChannel] = useState('안내사항');
  const [activeCategory, setActiveCategory] = useState('전체'); // 데일리훕 카테고리 필터

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [session, setSession] = useState(null);
  const messagesContainerRef = useRef(null);

  const [authView, setAuthView] = useState('login');
  const [authMessage, setAuthMessage] = useState('');
  const [activeReplyInput, setActiveReplyInput] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [linkMetadata, setLinkMetadata] = useState({});

  // 운영자 권한 확인 함수
  const isAdmin = () => {
    return session?.email === 'ballaforlife@naver.com';
  };

  // localStorage에서 댓글 상태 복원
  useEffect(() => {
    const savedReplyInput = localStorage.getItem('activeReplyInput');
    const savedReplyText = localStorage.getItem('replyText');

    if (savedReplyInput && savedReplyInput !== 'null') {
      setActiveReplyInput(savedReplyInput);
    }
    if (savedReplyText) {
      setReplyText(savedReplyText);
    }
    // 항상 안내사항 채널로 시작하도록 설정
    setActiveChannel('안내사항');
  }, []);

  // 댓글 상태를 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('activeReplyInput', activeReplyInput);
    localStorage.setItem('replyText', replyText);
    // 항상 안내사항 채널로 저장
    localStorage.setItem('activeChannel', '안내사항');

    return () => {
      // cleanup
    };
  }, [activeReplyInput, replyText]);

  // YouTube 링크 감지 및 임베드 함수들
  const detectLinks = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches || [];
  };

  const isYouTubeLink = (url) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const getYouTubeThumbnail = (url) => {
    let videoId = '';
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1].split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    }
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
  };

  // 카카오톡 방식으로 Open Graph 메타데이터를 가져오는 함수
  const getOpenGraphData = async (url) => {
    try {
      const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}&meta=true&embed=meta`);
      const data = await response.json();

      if (data.status === 'success' && data.data.meta) {
        const meta = data.data.meta;
        return {
          title: meta.title || meta['og:title'] || '',
          description: meta.description || meta['og:description'] || '',
          image: meta.image?.url || meta['og:image'] || '',
          site: meta.publisher || meta['og:site_name'] || ''
        };
      }
    } catch (error) {
      console.error('Error fetching Open Graph data:', error);
    }
    return null;
  };

  // 링크 메타데이터 가져오기 (기본값)
  const fetchLinkMetadata = async (url) => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');

      return {
        title: url,
        description: `${hostname}에서 제공하는 콘텐츠입니다.`,
        image: `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`,
        site_name: hostname,
        url: url
      };
    } catch (error) {
      console.error('Error fetching link metadata:', error);
      return {
        title: url,
        description: '링크된 콘텐츠입니다.',
        image: '',
        site_name: url,
        url: url
      };
    }
  };

  // 링크 메타데이터 로드
  const loadLinkMetadata = async (url) => {
    if (linkMetadata[url]) {
      return linkMetadata[url];
    }

    const metadata = await fetchLinkMetadata(url);
    setLinkMetadata(prev => ({
      ...prev,
      [url]: metadata
    }));

    return metadata;
  };

  // Session management
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setSession(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (session) {
        const userDocRef = doc(db, 'users', session.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          setUserProfile(userDocSnap.data());
        } else {
          const username = session.displayName ||
            session.email?.split('@')[0] ||
            `사용자_${session.uid.slice(0, 8)}`;

          const newProfile = {
            username: username,
            avatar_url: session.photoURL || '/default-avatar.png',
            email: session.email
          };

          try {
            await setDoc(userDocRef, newProfile);
            setUserProfile(newProfile);
          } catch (error) {
            console.error('Error creating profile:', error);
            setUserProfile({
              username: username,
              avatar_url: '/default-avatar.png'
            });
          }
        }
      }
    };
    fetchUserProfile();
  }, [session]);

  // Fetch messages and subscribe to realtime updates
  useEffect(() => {
    setMessagesLoading(true);

    const q = query(
      collection(db, 'messages'),
      where('channel', '==', activeChannel),
      orderBy('created_at', 'asc')
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const messagesData = [];

      for (const docSnapshot of querySnapshot.docs) {
        const msgData = docSnapshot.data();
        const msgId = docSnapshot.id;

        // Fetch replies (subcollection)
        const repliesQuery = query(collection(db, 'messages', msgId, 'replies'), orderBy('created_at', 'asc'));

        // Fetch User Profile for message
        let profile = { username: 'Unknown', avatar_url: '/default-avatar.png' };
        if (msgData.user_id) {
          if (msgData.username) {
            profile = { username: msgData.username, avatar_url: msgData.avatar_url || '/default-avatar.png' };
          } else {
            try {
              const userSnap = await getDoc(doc(db, 'users', msgData.user_id));
              if (userSnap.exists()) profile = userSnap.data();
            } catch (e) { }
          }
        }

        const repliesSnap = await getDocs(repliesQuery);
        const replies = repliesSnap.docs.map(rDoc => ({ id: rDoc.id, ...rDoc.data() }));

        messagesData.push({
          id: msgId,
          ...msgData,
          profiles: profile,
          replies: replies,
          likes: msgData.likes || 0,
          laughs: msgData.laughs || 0,
          cries: msgData.cries || 0
        });
      }

      setMessages(messagesData);
      setMessagesLoading(false);
    });

    return () => unsubscribe();
  }, [activeChannel]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // 데일리훕 카테고리 필터링 함수
  const filterMessagesByCategory = (messages) => {
    if (activeChannel !== '데일리훕' || activeCategory === '전체') {
      return messages;
    }

    return messages.filter(message => {
      const links = detectLinks(message.content);

      if (links.length === 0) {
        return true;
      }

      const hasMatchingLink = links.some(link => {
        switch (activeCategory) {
          case 'YouTube':
            return isYouTubeLink(link);
          case 'News':
            return !isYouTubeLink(link);
          default:
            return true;
        }
      });

      return hasMatchingLink;
    });
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === '' || !session) return;

    if (activeChannel === '안내사항' && !isAdmin()) {
      alert('안내사항 채널은 운영자만 작성할 수 있습니다.');
      return;
    }

    if (newMessage.trim().length > 280) {
      alert('메시지는 280자를 초과할 수 없습니다.');
      return;
    }

    const messageToSend = newMessage;
    setNewMessage('');

    try {
      await addDoc(collection(db, 'messages'), {
        content: messageToSend,
        user_id: session.uid,
        channel: activeChannel,
        created_at: serverTimestamp(),
        username: userProfile?.username || 'Unknown',
        avatar_url: userProfile?.avatar_url || '/default-avatar.png',
        likes: 0,
        laughs: 0,
        cries: 0
      });
    } catch (error) {
      console.error('Error sending message:', error);
      alert('메시지 전송 실패');
      setNewMessage(messageToSend);
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    setAuthMessage('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setAuthMessage(error.message);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOut(auth);

      setSession(null);
      setUserProfile(null);
      setMessages([]);
      setNewMessage('');
      setEmail('');
      setPassword('');
      setAuthMessage('');
      setAuthView('login');
      setActiveReplyInput(null);
      setReplyText('');
      setLinkMetadata({});

      localStorage.removeItem('activeReplyInput');
      localStorage.removeItem('replyText');
      localStorage.removeItem('activeChannel');
    } catch (error) {
      console.error('로그아웃 중 오류:', error);
      alert('로그아웃 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (messageId, reactionType) => {
    if (!session) return;

    const messageRef = doc(db, 'messages', messageId);
    const reactionRef = doc(db, 'messages', messageId, 'reactions', session.uid);
    const reactionSnap = await getDoc(reactionRef);

    if (reactionSnap.exists()) {
      return;
    }

    try {
      await setDoc(reactionRef, { type: reactionType });

      const msgSnap = await getDoc(messageRef);
      if (msgSnap.exists()) {
        const data = msgSnap.data();
        const currentCount = data[reactionType + 's'] || 0;
        await updateDoc(messageRef, {
          [reactionType + 's']: currentCount + 1
        });
      }
    } catch (e) {
      console.error("Reaction error:", e);
    }
  };

  const getReactionCount = (messageId, reactionType) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return 0;

    switch (reactionType) {
      case 'like': return message.likes || 0;
      case 'laugh': return message.laughs || 0;
      case 'cry': return message.cries || 0;
      default: return 0;
    }
  };

  const toggleReplyInput = (messageId) => {
    if (activeReplyInput === messageId) {
      setActiveReplyInput(null);
      setReplyText('');
      localStorage.removeItem('activeReplyInput');
      localStorage.removeItem('replyText');
    } else {
      setActiveReplyInput(messageId);
      setReplyText('');
    }
  };

  const handleSendReply = async (messageId) => {
    if (!session || !replyText.trim()) return;

    if (replyText.trim().length > 280) {
      alert('댓글은 280자를 초과할 수 없습니다.');
      return;
    }

    const replyToSend = replyText.trim();
    setReplyText('');

    try {
      await addDoc(collection(db, 'messages', messageId, 'replies'), {
        content: replyToSend,
        user_id: session.uid,
        created_at: serverTimestamp(),
        username: userProfile?.username || 'Unknown',
        avatar_url: userProfile?.avatar_url || '/default-avatar.png'
      });

      // Optimistic update
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            replies: [...(msg.replies || []), {
              id: 'temp-' + Date.now(),
              content: replyToSend,
              user_id: session.uid,
              created_at: new Date(),
              username: userProfile?.username || 'Unknown',
              avatar_url: userProfile?.avatar_url || '/default-avatar.png'
            }]
          };
        }
        return msg;
      }));

      setActiveReplyInput(null);
      localStorage.removeItem('activeReplyInput');
      localStorage.removeItem('replyText');

    } catch (error) {
      console.error('Error sending reply:', error);
      alert('댓글 저장 중 오류가 발생했습니다: ' + error.message);
      setReplyText(replyToSend);
    }
  };

  const renderAuth = () => (
    <div className="auth-container">
      {authView === 'login' ? (
        <div className="auth-form">
          <div className="auth-header">
            <h2 className="auth-title">로그인</h2>
          </div>
          <div className="auth-inputs-row">
            <div className="auth-input-group">
              <input
                type="email"
                placeholder="이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
              />
            </div>
            <div className="auth-input-group">
              <input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
              />
            </div>
            <div className="auth-buttons-group">
              <button
                onClick={handleSignIn}
                disabled={loading}
                className="auth-button auth-button-primary"
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>
              <button
                onClick={() => setAuthView('signup')}
                className="auth-button auth-button-secondary"
              >
                회원가입
              </button>
            </div>
            <div className="auth-social-login">
              <button
                onClick={async () => {
                  try {
                    const provider = new GoogleAuthProvider();
                    await signInWithPopup(auth, provider);
                  } catch (error) {
                    setAuthMessage(error.message);
                  }
                }}
                className="auth-button google-login-btn"
                style={{ marginTop: '10px', backgroundColor: '#4285F4', color: 'white', width: '100%' }}
              >
                Google 계정으로 로그인
              </button>
            </div>
          </div>
          {authMessage && <p className="auth-error">{authMessage}</p>}
        </div>
      ) : authView === 'signup' ? (
        <SignUpPage
          onSignUpSuccess={() => setAuthView('login')}
          onBackToLogin={() => setAuthView('login')}
        />
      ) : null}
    </div>
  );

  const LinkCard = ({ url }) => {
    const [metadata, setMetadata] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [ogData, setOgData] = useState(null);

    useEffect(() => {
      const loadMetadata = async () => {
        try {
          setLoading(true);
          const meta = await loadLinkMetadata(url);
          setMetadata(meta);

          if (!isYouTubeLink(url)) {
            const og = await getOpenGraphData(url);
            setOgData(og);
          }
        } catch (error) {
          console.error('Error loading link metadata:', error);
          setError(true);
        } finally {
          setLoading(false);
        }
      };

      loadMetadata();
    }, [url]);

    if (loading) {
      return (
        <div className="link-card loading">
          <div className="link-card-skeleton">
            <div className="skeleton-image"></div>
            <div className="skeleton-content">
              <div className="skeleton-title"></div>
              <div className="skeleton-description"></div>
              <div className="skeleton-url"></div>
            </div>
          </div>
        </div>
      );
    }

    if (error || !metadata) {
      return (
        <div className="link-card error">
          <a href={url} target="_blank" rel="noopener noreferrer" className="link-url">
            🔗 {url}
          </a>
        </div>
      );
    }

    return (
      <div className="link-card">
        <a href={url} target="_blank" rel="noopener noreferrer" className="link-card-content">
          {ogData?.image ? (
            <div className="link-card-image" style={{ backgroundImage: `url(${ogData.image})` }}></div>
          ) : (
            <div className="link-card-icon">
              <img src={metadata.image} alt="" onError={(e) => e.target.style.display = 'none'} />
            </div>
          )}
          <div className="link-card-text">
            <div className="link-card-title">{ogData?.title || metadata.title}</div>
            <div className="link-card-description">{ogData?.description || metadata.description}</div>
            <div className="link-card-site">{ogData?.site || metadata.site_name}</div>
          </div>
        </a>
      </div>
    );
  };

  const renderMessageContent = (content) => {
    const links = detectLinks(content);
    if (links.length === 0) {
      return <p className="message-text">{content}</p>;
    }

    let processedContent = content;
    const embeds = [];

    links.forEach((link, index) => {
      const linkId = `link-${index}`;
      processedContent = processedContent.replace(link, `[${linkId}]`);

      if (isYouTubeLink(link)) {
        const thumbnailUrl = getYouTubeThumbnail(link);
        if (thumbnailUrl) {
          embeds.push(
            <div key={linkId} className="link-embed youtube-embed">
              <a href={link} target="_blank" rel="noopener noreferrer" className="youtube-thumbnail">
                <img src={thumbnailUrl} alt="YouTube thumbnail" />
                <div className="youtube-play-button">▶</div>
              </a>
              <a href={link} target="_blank" rel="noopener noreferrer" className="link-url">
                {link}
              </a>
            </div>
          );
        }
      } else {
        embeds.push(
          <LinkCard key={linkId} url={link} />
        );
      }
    });

    return (
      <>
        <p className="message-text">{processedContent}</p>
        {embeds}
      </>
    );
  };

  const renderContent = () => {
    const filteredMessages = filterMessagesByCategory(messages);

    if (filteredMessages.length === 0) {
      return <div className="no-messages">메시지가 없습니다.</div>;
    }

    return filteredMessages.map((msg) => (
      <div key={msg.id} className="message-item">
        <img
          src={msg.profiles?.avatar_url || '/default-avatar.png'}
          alt="Profile"
          className="message-avatar"
        />
        <div className="message-content-wrapper">
          <span className="message-author">
            {msg.profiles?.username || '알 수 없는 사용자'}
          </span>

          {renderMessageContent(msg.content)}

          <div className="message-actions">
            <button className={`reaction-btn ${msg.likes > 0 ? 'active' : ''}`} onClick={() => handleReaction(msg.id, 'like')}>
              👍 <span className="reaction-count">{getReactionCount(msg.id, 'like')}</span>
            </button>
            <button className={`reaction-btn ${msg.laughs > 0 ? 'active' : ''}`} onClick={() => handleReaction(msg.id, 'laugh')}>
              😂 <span className="reaction-count">{getReactionCount(msg.id, 'laugh')}</span>
            </button>
            <button className={`reaction-btn ${msg.cries > 0 ? 'active' : ''}`} onClick={() => handleReaction(msg.id, 'cry')}>
              😢 <span className="reaction-count">{getReactionCount(msg.id, 'cry')}</span>
            </button>
            <button className="reply-btn" onClick={() => toggleReplyInput(msg.id)}>
              💬 댓글
            </button>
          </div>
          <span className="message-timestamp">
            {msg.created_at?.toDate ? msg.created_at.toDate().toLocaleString() : new Date().toLocaleString()}
          </span>

          {activeReplyInput === msg.id && (
            <div className="reply-input-container">
              <div className="reply-input-wrapper">
                <input
                  type="text"
                  placeholder="댓글을 입력하세요... (280자 제한)"
                  value={replyText}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 280) {
                      setReplyText(value);
                    }
                  }}
                  onKeyPress={(e) => { if (e.key === 'Enter') handleSendReply(msg.id); }}
                  maxLength={280}
                />
                <div className="character-count reply-char-count">
                  {replyText.length}/280
                </div>
              </div>
              <button onClick={() => handleSendReply(msg.id)} disabled={replyText.trim().length === 0 || replyText.length > 280}>
                전송
              </button>
              <button onClick={() => {
                setActiveReplyInput(null);
                setReplyText('');
                localStorage.removeItem('activeReplyInput');
                localStorage.removeItem('replyText');
              }}>취소</button>
            </div>
          )}

          {/* 댓글 목록 */}
          {msg.replies && msg.replies.length > 0 && (
            <div className="replies-container">
              {msg.replies.map((reply) => (
                <div key={reply.id} className="reply-item">
                  <div className="reply-content">
                    <span className="reply-author">
                      {reply.username ||
                        (reply.user_id ? `사용자_${reply.user_id.slice(0, 8)}` : '알 수 없는 사용자')}
                    </span>
                    <div className="reply-text-wrapper">
                      <p>{reply.content}</p>
                    </div>
                  </div>
                  <span className="reply-timestamp">
                    {reply.created_at?.toDate ? reply.created_at.toDate().toLocaleString() : new Date().toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    ));
  };

  return (
    <div className="community-page">
      {/* 상단 헤더 - 사이드바를 위로 이동 */}
      <div className="top-header">
        <div className="header-left">
          <h3 className="logo-small">
            <span className="hoopgle-red">H</span>
            <span className="hoopgle-yellow">o</span>
            <span className="hoopgle-navy">o</span>
            <span className="hoopgle-yellow">p</span>
            <span className="hoopgle-navy"> Z</span>
            <span className="hoopgle-yellow">o</span>
            <span className="hoopgle-navy">n</span>
            <span className="hoopgle-yellow">e</span>
          </h3>
          {session && (
            <div className="profile-info-below-logo">
              <span className="profile-name-below-logo">
                {userProfile?.username || session.email?.split('@')[0] || '사용자'}
              </span>
              <button onClick={handleSignOut} className="signout-button-below-logo" disabled={loading}>
                {loading ? '로그아웃 중...' : '로그아웃'}
              </button>
            </div>
          )}
        </div>

        <div className="header-center">
          <ul className="channel-list-horizontal">
            <li
              className={`channel-item-horizontal ${activeChannel === '안내사항' ? 'active' : ''}`}
              onClick={() => setActiveChannel('안내사항')}
            >
              📢 안내사항
            </li>
            <li
              className={`channel-item-horizontal ${activeChannel === '자유채팅' ? 'active' : ''}`}
              onClick={() => setActiveChannel('자유채팅')}
            >
              💬 자유채팅
            </li>
            <li
              className={`channel-item-horizontal ${activeChannel === '데일리훕' ? 'active' : ''}`}
              onClick={() => setActiveChannel('데일리훕')}
            >
              🔥 데일리훕
            </li>
          </ul>
        </div>
      </div>

      {/* 홈으로 버튼을 별도 영역으로 분리 */}
      <div className="home-button-container">
        <button onClick={onGoBack} className="back-button-community">홈으로</button>
      </div>

      {/* 데일리훕 카테고리 필터 */}
      {activeChannel === '데일리훕' && (
        <div className="category-filter">
          <button
            className={`category-button ${activeCategory === '전체' ? 'active' : ''}`}
            onClick={() => setActiveCategory('전체')}
          >
            전체
          </button>
          <button
            className={`category-button ${activeCategory === 'YouTube' ? 'active' : ''}`}
            onClick={() => setActiveCategory('YouTube')}
          >
            🎥 YouTube
          </button>
          <button
            className={`category-button ${activeCategory === 'News' ? 'active' : ''}`}
            onClick={() => setActiveCategory('News')}
          >
            📰 News
          </button>
        </div>
      )}

      <div className="chat-area">
        <div className="messages-list" ref={messagesContainerRef}>
          {messagesLoading ? (
            <div className="loading-messages">
              <div className="loading-spinner"></div>
              <p>메시지를 불러오는 중...</p>
            </div>
          ) : (
            renderContent()
          )}
        </div>

        <div className="chat-input-box">
          {session ? (
            <>
              {activeChannel === '안내사항' && !isAdmin() ? (
                <div className="admin-only-message">
                  <p>안내사항 채널은 운영자만 작성할 수 있습니다.</p>
                </div>
              ) : (
                <>
                  <div className="input-container">
                    <input
                      type="text"
                      placeholder={`${activeChannel}에 메시지 보내기 (280자 제한)`}
                      value={newMessage}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 280) {
                          setNewMessage(value);
                        }
                      }}
                      onKeyPress={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                      maxLength={280}
                    />
                    <div className="character-count">
                      {newMessage.length}/280
                    </div>
                  </div>
                  <button onClick={handleSendMessage} disabled={newMessage.trim().length === 0 || newMessage.length > 280}>
                    전송
                  </button>
                </>
              )}
            </>
          ) : (
            renderAuth()
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunityPage;