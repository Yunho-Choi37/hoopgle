import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
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
    return session?.user?.email === 'ballaforlife@naver.com';
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

  const isInstagramLink = (url) => {
    return url.includes('instagram.com') || url.includes('instagr.am');
  };

  const isNewsLink = (url) => {
    const newsDomains = [
      'naver.com', 'daum.net', 'google.com', 'yahoo.com', 
      'chosun.com', 'joongang.co.kr', 'donga.com', 'hankyung.com',
      'mk.co.kr', 'etnews.com', 'zdnet.co.kr', 'itworld.co.kr',
      'basketball.or.kr', 'kssbf.or.kr', 'koreabasketball.or.kr'
    ];
    return newsDomains.some(domain => url.includes(domain));
  };

  // getYouTubeEmbedUrl 함수 제거 - 더 이상 사용하지 않음

  const getYouTubeThumbnail = (url) => {
    let videoId = '';
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1].split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    }
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
  };

  const getInstagramThumbnail = (url) => {
    // Instagram URL에서 post ID 추출
    let postId = '';
    if (url.includes('instagram.com/p/')) {
      postId = url.split('instagram.com/p/')[1].split('/')[0];
    } else if (url.includes('instagram.com/reel/')) {
      postId = url.split('instagram.com/reel/')[1].split('/')[0];
    }
    
    if (postId) {
      // Instagram의 oEmbed API를 통해 썸네일 가져오기 시도
      // 실제로는 Instagram API 제한으로 인해 기본 이미지 사용
      return `https://www.instagram.com/p/${postId}/media/?size=l`;
    }
    return null;
  };

  // Instagram 썸네일 로드 시 에러 처리
  const handleInstagramImageError = (event) => {
    // 이미지 로드 실패 시 기본 Instagram 아이콘으로 대체
    event.target.style.display = 'none';
    const container = event.target.parentElement;
    container.innerHTML = `
      <div style="
        width: 100%; 
        height: 200px; 
        background: linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%);
        display: flex; 
        align-items: center; 
        justify-content: center; 
        border-radius: 8px;
        color: white;
        font-size: 24px;
      ">
        📷 Instagram
      </div>
    `;
  };

  // toggleVideoExpansion 함수 제거 - 더 이상 사용하지 않음

  // 링크 메타데이터 가져오기
  const fetchLinkMetadata = async (url) => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');
      
      // 일반적인 사이트별 제목 생성
      let title = url;
      let description = `${hostname}에서 제공하는 콘텐츠입니다.`;
      
      // 특정 사이트에 대한 커스텀 처리
      if (hostname.includes('github.com')) {
        title = 'GitHub 저장소';
        description = 'GitHub에서 호스팅되는 프로젝트나 저장소입니다.';
      } else if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        title = 'YouTube 동영상';
        description = 'YouTube 동영상 링크입니다.';
      } else if (hostname.includes('instagram.com') || hostname.includes('instagr.am')) {
        title = 'Instagram 포스트';
        description = 'Instagram에서 공유된 포스트입니다.';
      } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
        title = 'Twitter/X 포스트';
        description = 'Twitter/X에서 공유된 포스트입니다.';
      } else if (hostname.includes('facebook.com')) {
        title = 'Facebook 포스트';
        description = 'Facebook에서 공유된 포스트입니다.';
      } else if (hostname.includes('linkedin.com')) {
        title = 'LinkedIn 포스트';
        description = 'LinkedIn에서 공유된 포스트입니다.';
      }
      
      return {
        title: title,
        description: description,
        image: '',
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
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (session?.user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', session.user.id)
          .single();

        if (error) {
          setUserProfile({
            username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || '사용자',
            avatar_url: '/default-avatar.png'
          });
        } else {
          setUserProfile(data);
        }
      }
    };
    fetchUserProfile();
  }, [session]);

  const fetchMessages = async () => {
    console.log('Fetching messages for channel:', activeChannel);
    setMessagesLoading(true);
    
    // 1. 메시지와 프로필을 한 번에 가져오기
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select(`*,
        profiles(username, avatar_url)
      `)
      .eq('channel', activeChannel)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return;
    }

    if (!messagesData || messagesData.length === 0) {
      setMessages([]);
      return;
    }

    // 2. 모든 메시지 ID 수집
    const messageIds = messagesData.map(msg => msg.id);
    
    // 3. 반응 데이터를 한 번에 가져오기
    const { data: reactionsData } = await supabase
      .from('message_reactions')
      .select('message_id, reaction_type')
      .in('message_id', messageIds);

    // 4. 댓글 데이터를 한 번에 가져오기 (JOIN 사용)
    const { data: repliesData } = await supabase
      .from('message_replies')
      .select(`
        id,
        message_id,
        user_id,
        content,
        created_at,
        profiles(username, avatar_url)
      `)
      .in('message_id', messageIds)
      .order('created_at', { ascending: true });

    // 5. 클라이언트에서 데이터 조합
    const messagesWithReactions = messagesData.map(message => {
      // 해당 메시지의 반응들
      const messageReactions = reactionsData?.filter(r => r.message_id === message.id) || [];
      const likes = messageReactions.filter(r => r.reaction_type === 'like').length;
      const laughs = messageReactions.filter(r => r.reaction_type === 'laugh').length;
      const cries = messageReactions.filter(r => r.reaction_type === 'cry').length;

      // 해당 메시지의 댓글들
      const messageReplies = repliesData?.filter(r => r.message_id === message.id) || [];

      return {
        ...message,
        likes,
        laughs,
        cries,
        replies: messageReplies
      };
    });

    console.log('Final messages with reactions and replies:', messagesWithReactions);
    setMessages(messagesWithReactions);
    setMessagesLoading(false);
  };

  useEffect(() => {
    fetchMessages();

    // 실시간 구독 설정 - 최적화된 버전
    const messageSubscription = supabase
      .channel(`messages-for-${activeChannel}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel=eq.${activeChannel}` },
        (payload) => {
          console.log('New message received:', payload);
          // 새 메시지만 추가 (전체 재로딩 방지)
          if (payload.new) {
            const newMessage = {
              ...payload.new,
              likes: 0,
              laughs: 0,
              cries: 0,
              replies: []
            };
            setMessages(prev => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    // 댓글 실시간 구독 - 최적화된 버전
    const replySubscription = supabase
      .channel(`replies-for-${activeChannel}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_replies' },
        (payload) => {
          console.log('New reply received:', payload);
          // 해당 메시지에 댓글만 추가
          if (payload.new) {
            setMessages(prev => prev.map(msg => {
              if (msg.id === payload.new.message_id) {
                return {
                  ...msg,
                  replies: [...(msg.replies || []), payload.new]
                };
              }
              return msg;
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageSubscription);
      supabase.removeChannel(replySubscription);
    };
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
      if (links.length === 0) return false;

      return links.some(link => {
        switch (activeCategory) {
          case 'YouTube':
            return isYouTubeLink(link);
          case 'Instagram':
            return isInstagramLink(link);
          case 'News':
            return isNewsLink(link);
          default:
            return true;
        }
      });
    });
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === '' || !session?.user) return;
    
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

    // Optimistic update - 메시지를 즉시 화면에 추가
    const optimisticMessage = {
      id: Math.random().toString(),
      content: messageToSend,
      created_at: new Date().toISOString(),
      user_id: session.user.id,
      channel: activeChannel,
      profiles: userProfile || {
        username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || '사용자',
        avatar_url: '/default-avatar.png'
      }
    };

    setMessages(currentMessages => [...currentMessages, optimisticMessage]);

    const { error } = await supabase
      .from('messages')
      .insert({
        content: messageToSend,
        user_id: session.user.id,
        channel: activeChannel,
      });

    if (error) {
      console.error('Error sending message:', error);
      // 에러가 발생하면 optimistic message를 제거하고 원래 메시지를 복원
      setMessages(currentMessages => currentMessages.filter(m => m.id !== optimisticMessage.id));
      setNewMessage(messageToSend);
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    setAuthMessage('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthMessage(error.error_description || error.message);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      
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
      
      console.log('로그아웃 성공');
    } catch (error) {
      console.error('로그아웃 중 오류:', error);
      alert('로그아웃 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (messageId, reactionType) => {
    if (!session?.user) return;

    const { error } = await supabase
      .from('message_reactions')
      .upsert({
        message_id: messageId,
        user_id: session.user.id,
        reaction_type: reactionType,
      });

    if (error) {
      console.error('Error adding reaction:', error);
    } else {
      fetchMessages();
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
    if (!session?.user || !replyText.trim()) return;

    // 280자 제한 확인
    if (replyText.trim().length > 280) {
      alert('댓글은 280자를 초과할 수 없습니다.');
      return;
    }

    const replyToSend = replyText.trim();
    setReplyText('');

    console.log('Sending reply:', {
      messageId,
      userId: session.user.id,
      content: replyToSend
    });

    try {
      // 댓글을 데이터베이스에 저장
      const { data, error } = await supabase
        .from('message_replies')
        .insert({
          message_id: messageId,
          user_id: session.user.id,
          content: replyToSend,
        })
        .select(`
          id,
          message_id,
          user_id,
          content,
          created_at
        `);

      if (error) {
        console.error('Error sending reply:', error);
        alert('댓글 저장 중 오류가 발생했습니다: ' + error.message);
        setReplyText(replyToSend);
      } else {
        console.log('Reply sent successfully:', data);
        
        // 성공적으로 저장된 댓글을 현재 메시지에 추가
        if (data && data.length > 0) {
          const savedReply = data[0];
          
          // 사용자 프로필 정보 가져오기
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', session.user.id)
            .single();
          
          const replyWithProfile = {
            ...savedReply,
            profiles: profileError ? {
              username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || '사용자',
              avatar_url: '/default-avatar.png'
            } : profileData
          };
          
          setMessages(currentMessages => 
            currentMessages.map(msg => 
              msg.id === messageId 
                ? { 
                    ...msg, 
                    replies: [
                      ...(msg.replies || []),
                      replyWithProfile
                    ]
                  }
                : msg
            )
          );
        }
        
        setActiveReplyInput(null);
        localStorage.removeItem('activeReplyInput');
        localStorage.removeItem('replyText');
      }
    } catch (error) {
      console.error('Exception in handleSendReply:', error);
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
      } else if (isInstagramLink(link)) {
        const thumbnailUrl = getInstagramThumbnail(link);
        if (thumbnailUrl) {
          embeds.push(
            <div key={linkId} className="link-embed instagram-embed">
              <a href={link} target="_blank" rel="noopener noreferrer" className="instagram-thumbnail">
                <img 
                  src={thumbnailUrl} 
                  alt="Instagram thumbnail" 
                  onError={handleInstagramImageError}
                />
              </a>
              <a href={link} target="_blank" rel="noopener noreferrer" className="link-url">
                {link}
              </a>
            </div>
          );
        } else {
          // 썸네일을 가져올 수 없는 경우 기본 링크 카드 사용
          embeds.push(
            <LinkCard key={linkId} url={link} />
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

  // 링크 카드 컴포넌트
  const LinkCard = ({ url }) => {
    const [metadata, setMetadata] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
      const loadMetadata = async () => {
        try {
          setLoading(true);
          const meta = await loadLinkMetadata(url);
          setMetadata(meta);
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
        <a href={url} target="_blank" rel="noopener noreferrer" className="link-card-link">
          {metadata.image && (
            <div className="link-card-image">
              <img src={metadata.image} alt={metadata.title} />
            </div>
          )}
          <div className="link-card-content">
            <div className="link-card-title">{metadata.title}</div>
            {metadata.description && (
              <div className="link-card-description">{metadata.description}</div>
            )}
            <div className="link-card-meta">
              <span className="link-card-site">{metadata.site_name}</span>
              <span className="link-card-url">{url}</span>
            </div>
          </div>
        </a>
      </div>
    );
  };

  const renderContent = () => {
    const filteredMessages = filterMessagesByCategory(messages);
    
    return (
      <div className="messages-list-content">
        {filteredMessages.length === 0 ? (
          <p className="no-messages">
            {activeChannel === '안내사항' ? '안내사항 채널입니다.' : 
             activeChannel === '데일리훕' && activeCategory !== '전체' ? 
             `${activeCategory} 관련 콘텐츠가 없습니다.` : 
             '메시지가 없습니다. 첫 메시지를 남겨보세요!'}
          </p>
        ) : (
          filteredMessages.map((msg) => (
            <div key={msg.id} className="message-item">
              <div className="message-content-wrapper">
                <span className="message-author">
                  {msg.profiles?.username || `사용자_${msg.user_id?.slice(0, 8)}`}
                </span>
                {renderMessageContent(msg.content)}
                <div className="message-actions">
                  <button className="reaction-btn" onClick={() => handleReaction(msg.id, 'like')}>
                    👍 <span className="reaction-count">{getReactionCount(msg.id, 'like')}</span>
                  </button>
                  <button className="reaction-btn" onClick={() => handleReaction(msg.id, 'laugh')}>
                    😂 <span className="reaction-count">{getReactionCount(msg.id, 'laugh')}</span>
                  </button>
                  <button className="reaction-btn" onClick={() => handleReaction(msg.id, 'cry')}>
                    😢 <span className="reaction-count">{getReactionCount(msg.id, 'cry')}</span>
                  </button>
                  <button className="reply-btn" onClick={() => toggleReplyInput(msg.id)}>
                    💬 댓글
                  </button>
                </div>
                <span className="message-timestamp">
                  {new Date(msg.created_at).toLocaleString()}
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
                            {reply.profiles?.username || `사용자_${reply.user_id?.slice(0, 8)}`}
                          </span>
                          <div className="reply-text-wrapper">
                            <p>{reply.content}</p>
                          </div>
                        </div>
                        <span className="reply-timestamp">
                          {new Date(reply.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    );
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
                {userProfile?.username || session.user.user_metadata?.username || session.user.email?.split('@')[0] || '사용자'}
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
            className={`category-button ${activeCategory === 'Instagram' ? 'active' : ''}`}
            onClick={() => setActiveCategory('Instagram')}
          >
            📷 Instagram
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