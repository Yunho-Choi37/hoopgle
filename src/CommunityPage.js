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

    // 컴포넌트가 언마운트될 때 cleanup 함수
    return () => {
      // 컴포넌트가 언마운트될 때는 localStorage를 정리하지 않음 (사용자가 다른 곳으로 이동한 경우)
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

  const isNewsLink = (url) => {
    const newsDomains = [
      'naver.com', 'daum.net', 'google.com', 'yahoo.com',
      'chosun.com', 'joongang.co.kr', 'donga.com', 'hankyung.com',
      'mk.co.kr', 'etnews.com', 'zdnet.co.kr', 'itworld.co.kr',
      'basketball.or.kr', 'kssbf.or.kr', 'koreabasketball.or.kr',
      'sports.news.naver.com', 'news.naver.com', 'sports.daum.net',
      'news.daum.net', 'sportskhan.co.kr', 'sportsworldi.com',
      'sportalkorea.com', 'basketball.or.kr', 'kbl.or.kr', 'wkbl.or.kr'
    ];
    const isNews = newsDomains.some(domain => url.includes(domain));
    // console.log('News link check:', url, 'isNews:', isNews);
    return isNews;
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

  // 모든 사이트의 썸네일을 가져오는 함수
  const getSiteThumbnail = (url) => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');

      // YouTube는 기존 함수 사용
      if (isYouTubeLink(url)) {
        return getYouTubeThumbnail(url);
      }

      // 다른 사이트들은 메타데이터에서 이미지 가져오기
      return null; // 메타데이터에서 처리
    } catch (error) {
      console.error('Error generating site thumbnail:', error);
      return null;
    }
  };

  // 카카오톡 방식으로 Open Graph 메타데이터를 가져오는 함수
  const getOpenGraphData = async (url) => {
    try {
      // Microlink API를 사용하여 Open Graph 메타데이터 가져오기
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
        // 1. Check user info in 'users' collection
        const userDocRef = doc(db, 'users', session.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          // console.log('Profile found:', userDocSnap.data());
          setUserProfile(userDocSnap.data());
        } else {
          // console.log('Profile not found, creating new profile...');

          // 2. Create new profile if not exists
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
            // console.log('Profile created successfully:', newProfile);
            setUserProfile(newProfile);
          } catch (error) {
            console.error('Error creating profile:', error);
            // 3. Use default if creation fails
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
    // console.log('Fetching messages for channel:', activeChannel);
    setMessagesLoading(true);

    const q = query(
      collection(db, 'messages'),
      where('channel', '==', activeChannel),
      orderBy('created_at', 'asc')
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const messagesData = [];

      // Process messages
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
            // Fallback fetch
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

    // console.log('Filtering messages for category:', activeCategory);

    return messages.filter(message => {
      const links = detectLinks(message.content);
      // console.log('Message links:', links);

      // 링크가 없는 메시지는 모든 카테고리에서 보이도록 함
      if (links.length === 0) {
        // console.log('No links found, showing message');
        return true;
      }

      const hasMatchingLink = links.some(link => {
        switch (activeCategory) {
          case 'YouTube':
            // YouTube 링크만 표시
            return isYouTubeLink(link);
          case 'News':
            // YouTube가 아닌 모든 링크 표시
            return !isYouTubeLink(link);
          default:
            return true;
        }
      });

      // console.log('Message has matching link:', hasMatchingLink);
      return hasMatchingLink;
    });
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === '' || !session) return;

    // 안내사항 채널에서 운영자 권한 확인
    if (activeChannel === '안내사항' && !isAdmin()) {
      alert('안내사항 채널은 운영자만 작성할 수 있습니다.');
      return;
    }

    // 280자 제한 확인
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
        username: userProfile?.username || 'Unknown', // Denormalize
        avatar_url: userProfile?.avatar_url || '/default-avatar.png', // Denormalize
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

      // 로그아웃 후 상태 정리
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

      // localStorage 정리
      localStorage.removeItem('activeReplyInput');
      localStorage.removeItem('replyText');
      localStorage.removeItem('activeChannel');

      // console.log('로그아웃 성공');
    } catch (error) {
      console.error('로그아웃 중 오류:', error);
      alert('로그아웃 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (messageId, reactionType) => {
    if (!session) return;

    // In Firestore, simpler to just increment a counter on the message document
    // and maybe store the user's reaction in a subcollection to prevent double voting if needed.
    // For simplicity here, we will just increment the counter.
    // Note: This doesn't prevent multiple votes from same user easily without extra logic.

    const messageRef = doc(db, 'messages', messageId);

    // To prevent multiple votes, we should check a 'reactions' subcollection.
    const reactionRef = doc(db, 'messages', messageId, 'reactions', session.uid);
    const reactionSnap = await getDoc(reactionRef);

    if (reactionSnap.exists()) {
      // Already reacted? Toggle or ignore? 
      // Let's just ignore for now to keep it simple, or toggle.
      return;
    }

    try {
      await setDoc(reactionRef, { type: reactionType });

      // Increment counter
      // We need to read the current count or use increment(). 
      // Let's use updateDoc with increment if we imported it, but we didn't.
      // Let's just read and update.
      const msgSnap = await getDoc(messageRef);
      if (msgSnap.exists()) {
        const data = msgSnap.data();
        const currentCount = data[reactionType + 's'] || 0; // likes, laughs, cries
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
      case 'like':
        return message.likes || 0;
      case 'laugh':
        return message.laughs || 0;
      case 'cry':
        return message.cries || 0;
      default:
        return 0;
    }
  };

  const toggleReplyInput = (messageId) => {
    if (activeReplyInput === messageId) {
      // 댓글 입력 취소
      setActiveReplyInput(null);
      setReplyText('');
      localStorage.removeItem('activeReplyInput');
      localStorage.removeItem('replyText');
    } else {
      // 댓글 입력 시작
      setActiveReplyInput(messageId);
      setReplyText('');
    }
  };

  const handleSendReply = async (messageId) => {
    if (!session || !replyText.trim()) return;

    // 280자 제한 확인
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

      // Manually update local state to show reply immediately (since we don't have realtime listener for replies)
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
        // YouTube는 기존 방식으로 크게 표시
        const thumbnailUrl = getYouTubeThumbnail(link);
        if (thumbnailUrl) {
          embeds.push(
            <div key={linkId} className="link-embed youtube-embed">
              <a href={link} target="_blank" rel="noopener noreferrer" className="youtube-thumbnail">
                <img src={thumbnailUrl} alt="YouTube thumbnail" />
              </a>
              <a href={link} target="_blank" rel="noopener noreferrer" className="link-url">
                {link}
              </a>
            </div>
          );
        }
      } else {
        // 다른 사이트들은 메타데이터를 사용하여 썸네일 표시
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

  // 링크 카드 컴포넌트
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

          // YouTube가 아닌 경우 Open Graph 데이터 가져오기
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

  return (
    <div className="community-container">
      <div className="community-header">
        <h1 className="logo-small" onClick={onGoBack}>
          <span className="hoopgle-red">H</span><span className="hoopgle-yellow">o</span><span className="hoopgle-navy">o</span><span className="hoopgle-yellow">p</span><span className="hoopgle-navy">d</span><span className="hoopgle-yellow">e</span><span className="hoopgle-navy">x</span>
        </h1>
        <button onClick={onGoBack} className="home-button-community">홈으로</button>
      </div>

      <div className="community-content">
        <div className="channels-sidebar">
          <button
            className={`channel-button ${activeChannel === '안내사항' ? 'active' : ''}`}
            onClick={() => setActiveChannel('안내사항')}
          >
            📢 안내사항
          </button>
          <button
            className={`channel-button ${activeChannel === '자유게시판' ? 'active' : ''}`}
            onClick={() => setActiveChannel('자유게시판')}
          >
            🗣 자유게시판
          </button>
          <button
            className={`channel-button ${activeChannel === '데일리훕' ? 'active' : ''}`}
            onClick={() => setActiveChannel('데일리훕')}
          >
            🏀 데일리훕
          </button>
        </div>

        <div className="chat-area">
          <div className="chat-header">
            <h2>{activeChannel}</h2>
            {/* 데일리훕 채널일 때 카테고리 필터 표시 */}
            {activeChannel === '데일리훕' && (
              <div className="category-filters">
                <button
                  className={`category-filter-btn ${activeCategory === '전체' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('전체')}
                >
                  전체
                </button>
                <button
                  className={`category-filter-btn ${activeCategory === 'YouTube' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('YouTube')}
                >
                  YouTube
                </button>
                <button
                  className={`category-filter-btn ${activeCategory === 'News' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('News')}
                >
                  News
                </button>
              </div>
            )}
          </div>

          <div className="messages-container" ref={messagesContainerRef}>
            {messagesLoading ? (
              <div className="loading-messages">메시지 로딩 중...</div>
            ) : (
              filterMessagesByCategory(messages).map((message) => (
                <div key={message.id} className="message-item">
                  <div className="message-avatar">
                    <img src={message.profiles?.avatar_url || '/default-avatar.png'} alt="Avatar" />
                  </div>
                  <div className="message-content-wrapper">
                    <div className="message-header">
                      <span className="username">{message.profiles?.username || 'Unknown'}</span>
                      <span className="timestamp">{new Date(message.created_at?.toDate ? message.created_at.toDate() : message.created_at).toLocaleString()}</span>
                    </div>
                    <div className="message-body">
                      {renderMessageContent(message.content)}
                    </div>

                    <div className="message-actions">
                      <button
                        className={`reaction-btn ${getReactionCount(message.id, 'like') > 0 ? 'active' : ''}`}
                        onClick={() => handleReaction(message.id, 'like')}
                      >
                        👍 {getReactionCount(message.id, 'like')}
                      </button>
                      <button
                        className={`reaction-btn ${getReactionCount(message.id, 'laugh') > 0 ? 'active' : ''}`}
                        onClick={() => handleReaction(message.id, 'laugh')}
                      >
                        😂 {getReactionCount(message.id, 'laugh')}
                      </button>
                      <button
                        className={`reaction-btn ${getReactionCount(message.id, 'cry') > 0 ? 'active' : ''}`}
                        onClick={() => handleReaction(message.id, 'cry')}
                      >
                        😭 {getReactionCount(message.id, 'cry')}
                      </button>
                      <button className="reply-btn" onClick={() => toggleReplyInput(message.id)}>
                        💬 댓글 {message.replies?.length || 0}
                      </button>
                    </div>

                    {/* 댓글 목록 */}
                    {message.replies && message.replies.length > 0 && (
                      <div className="replies-list">
                        {message.replies.map(reply => (
                          <div key={reply.id} className="reply-item">
                            <div className="reply-avatar">
                              <img src={reply.avatar_url || '/default-avatar.png'} alt="Reply Avatar" />
                            </div>
                            <div className="reply-content">
                              <div className="reply-header">
                                <span className="reply-username">{reply.username || 'Unknown'}</span>
                                <span className="reply-timestamp">
                                  {reply.created_at?.toDate ? new Date(reply.created_at.toDate()).toLocaleString() : new Date(reply.created_at).toLocaleString()}
                                </span>
                              </div>
                              <div className="reply-text">{reply.content}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 댓글 입력창 */}
                    {activeReplyInput === message.id && (
                      <div className="reply-input-area">
                        {session ? (
                          <>
                            <input
                              type="text"
                              placeholder="댓글을 입력하세요..."
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleSendReply(message.id)}
                            />
                            <button onClick={() => handleSendReply(message.id)}>등록</button>
                          </>
                        ) : (
                          <div className="login-required-msg">댓글을 작성하려면 로그인이 필요합니다.</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {messages.length === 0 && !messagesLoading && (
              <div className="no-messages">메시지가 없습니다.</div>
            )}
          </div>

          <div className="message-input-area">
            {session ? (
              <>
                <textarea
                  placeholder={activeChannel === '안내사항' && !isAdmin() ? "안내사항은 운영자만 작성할 수 있습니다." : "메시지를 입력하세요..."}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={activeChannel === '안내사항' && !isAdmin()}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={activeChannel === '안내사항' && !isAdmin()}
                >
                  전송
                </button>
              </>
            ) : (
              renderAuth()
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityPage;