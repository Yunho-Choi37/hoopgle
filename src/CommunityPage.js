import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import SignUpPage from './SignUpPage';
import './CommunityPage.css';

const CommunityPage = ({ onGoBack }) => {
  const [activeChannel, setActiveChannel] = useState('안내사항');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [session, setSession] = useState(null);
  const messagesContainerRef = useRef(null);

  const [authView, setAuthView] = useState('login');
  const [authMessage, setAuthMessage] = useState('');
  const [activeReplyInput, setActiveReplyInput] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [expandedVideos, setExpandedVideos] = useState(new Set());
  const [linkMetadata, setLinkMetadata] = useState({});

  // localStorage에서 댓글 상태 복원
  useEffect(() => {
    const savedReplyInput = localStorage.getItem('activeReplyInput');
    const savedReplyText = localStorage.getItem('replyText');
    const savedChannel = localStorage.getItem('activeChannel');
    
    if (savedReplyInput && savedReplyInput !== 'null') {
      setActiveReplyInput(savedReplyInput);
    }
    if (savedReplyText) {
      setReplyText(savedReplyText);
    }
    if (savedChannel) {
      setActiveChannel(savedChannel);
    }
  }, []);

  // 댓글 상태를 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('activeReplyInput', activeReplyInput);
    localStorage.setItem('replyText', replyText);
    localStorage.setItem('activeChannel', activeChannel);

    // 컴포넌트가 언마운트될 때 cleanup 함수
    return () => {
      // 컴포넌트가 언마운트될 때는 localStorage를 정리하지 않음 (사용자가 다른 곳으로 이동한 경우)
    };
  }, [activeReplyInput, replyText, activeChannel]);

  // YouTube 링크 감지 및 임베드 함수들
  const detectLinks = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches || [];
  };

  const isYouTubeLink = (url) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const getYouTubeEmbedUrl = (url) => {
    let videoId = '';
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1].split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
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

  const toggleVideoExpansion = (linkId) => {
    setExpandedVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(linkId)) {
        newSet.delete(linkId);
      } else {
        newSet.add(linkId);
      }
      return newSet;
    });
  };

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
      } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
        title = 'Twitter/X 포스트';
        description = 'Twitter/X에서 공유된 포스트입니다.';
      } else if (hostname.includes('instagram.com')) {
        title = 'Instagram 포스트';
        description = 'Instagram에서 공유된 포스트입니다.';
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
    const { data, error } = await supabase
      .from('messages')
      .select(`*,
        profiles(username, avatar_url)
      `)
      .eq('channel', activeChannel)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    } else {
      console.log('Fetched messages:', data);
      
      // 각 메시지의 반응 데이터와 댓글을 가져오기
      const messagesWithReactions = await Promise.all(
        (data || []).map(async (message) => {
          // 반응 데이터 가져오기
          const { data: reactionsData } = await supabase
            .from('message_reactions')
            .select('reaction_type')
            .eq('message_id', message.id);
          
          // 댓글 데이터 가져오기
          console.log('Fetching replies for message:', message.id);
          let repliesData = [];
          try {
            const { data: replies, error: repliesError } = await supabase
              .from('message_replies')
              .select(`
                id,
                message_id,
                user_id,
                content,
                created_at
              `)
              .eq('message_id', message.id)
              .order('created_at', { ascending: true });
            
            if (repliesError) {
              console.error('Error fetching replies for message:', message.id, repliesError);
            } else {
              console.log('Fetched replies for message:', message.id, replies);
              
              // 댓글의 사용자 프로필을 별도로 가져오기
              if (replies && replies.length > 0) {
                repliesData = await Promise.all(
                  replies.map(async (reply) => {
                    const { data: profileData, error: profileError } = await supabase
                      .from('profiles')
                      .select('username, avatar_url')
                      .eq('id', reply.user_id)
                      .single();
                    
                    if (profileError) {
                      console.error('Error fetching profile for reply user:', reply.user_id, profileError);
                      return {
                        ...reply,
                        profiles: {
                          username: `사용자_${reply.user_id?.slice(0, 8)}`,
                          avatar_url: '/default-avatar.png'
                        }
                      };
                    }
                    
                    return {
                      ...reply,
                      profiles: profileData || {
                        username: `사용자_${reply.user_id?.slice(0, 8)}`,
                        avatar_url: '/default-avatar.png'
                      }
                    };
                  })
                );
              }
            }
          } catch (error) {
            console.error('Exception while fetching replies:', error);
          }
          
          // 반응 개수 계산
          const likes = reactionsData?.filter(r => r.reaction_type === 'like').length || 0;
          const laughs = reactionsData?.filter(r => r.reaction_type === 'laugh').length || 0;
          const cries = reactionsData?.filter(r => r.reaction_type === 'cry').length || 0;
          
          return {
            ...message,
            likes,
            laughs,
            cries,
            replies: repliesData
          };
        })
      );
      
      console.log('Final messages with replies:', messagesWithReactions);
      setMessages(messagesWithReactions);
    }
  };

  useEffect(() => {
    fetchMessages();

    // 실시간 구독 설정
    const messageSubscription = supabase
      .channel(`messages-for-${activeChannel}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel=eq.${activeChannel}` },
        (payload) => {
          console.log('New message received:', payload);
          fetchMessages();
        }
      )
      .subscribe();

    // 댓글 실시간 구독
    const replySubscription = supabase
      .channel(`replies-for-${activeChannel}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_replies' },
        (payload) => {
          console.log('New reply received:', payload);
          fetchMessages();
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

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === '' || !session?.user) return;
    
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
      setExpandedVideos(new Set());
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
            <p className="auth-subtitle">Hoop Zone에 오신 것을 환영합니다</p>
          </div>
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
          {authMessage && <p className="auth-error">{authMessage}</p>}
          <button 
            onClick={handleSignIn} 
            disabled={loading}
            className="auth-button auth-button-primary"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
          <div className="auth-divider">
            <span>또는</span>
          </div>
          <button 
            onClick={() => setAuthView('signup')} 
            className="auth-button auth-button-secondary"
          >
            회원가입
          </button>
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
        const embedUrl = getYouTubeEmbedUrl(link);
        const thumbnailUrl = getYouTubeThumbnail(link);
        const isExpanded = expandedVideos.has(linkId);
        
        if (embedUrl) {
          embeds.push(
            <div key={linkId} className="link-embed youtube-embed">
              {!isExpanded ? (
                <div className="youtube-thumbnail" onClick={() => toggleVideoExpansion(linkId)}>
                  <img 
                    src={thumbnailUrl} 
                    alt="YouTube thumbnail" 
                  />
                  <div className="youtube-play-button">▶️</div>
                </div>
              ) : (
                <div className="youtube-embed-iframe">
                  <iframe
                    width="100%"
                    height="200"
                    src={embedUrl + "?autoplay=1"}
                    title="YouTube video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                  <button 
                    className="youtube-collapse-btn"
                    onClick={() => toggleVideoExpansion(linkId)}
                  >
                    접기
                  </button>
                </div>
              )}
              <a href={link} target="_blank" rel="noopener noreferrer" className="link-url">
                {link}
              </a>
            </div>
          );
        }
      } else {
        // 일반 링크 - 메타데이터 카드로 표시
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
    if (activeChannel === '안내사항') {
      return (
        <>
          <div className="message-item">
            <span className="message-author">운영자</span>
            <p>Hoop Zone에 오신 것을 환영합니다! 커뮤니티 규칙을 잘 지켜주세요.</p>
          </div>
          <div className="message-item">
            <span className="message-author">운영자</span>
            <p>선수 비방이나 욕설은 경고 없이 삭제될 수 있습니다.</p>
          </div>
        </>
      );
    }

    return (
      <div className="messages-list-content">
        {messages.length === 0 ? (
          <p className="no-messages">메시지가 없습니다. 첫 메시지를 남겨보세요!</p>
        ) : (
          messages.map((msg) => (
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
      <div className={`channels-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="channels-header">
          {/* 사이드바 토글 버튼 */}
          <button 
            onClick={toggleSidebar} 
            className={`sidebar-toggle-button ${isSidebarOpen ? 'open' : 'closed'}`}
            title={isSidebarOpen ? '사이드바 숨기기' : '사이드바 보이기'}
          >
            <div className="toggle-icon">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>
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
        </div>
        <ul className="channel-list">
          <li 
            className={`channel-item ${activeChannel === '안내사항' ? 'active' : ''}`} 
            onClick={() => setActiveChannel('안내사항')}
          >
            📢 안내사항
          </li>
          <li 
            className={`channel-item ${activeChannel === '자유채팅' ? 'active' : ''}`} 
            onClick={() => setActiveChannel('자유채팅')}
          >
            💬 자유채팅
          </li>
          <li 
            className={`channel-item ${activeChannel === '데일리훕' ? 'active' : ''}`} 
            onClick={() => setActiveChannel('데일리훕')}
          >
            🔥 데일리훕
          </li>
        </ul>
        {session && (
          <div className="profile-section">
            <span className="profile-name">
              {userProfile?.username || session.user.user_metadata?.username || session.user.email?.split('@')[0] || '사용자'}
            </span>
            <button onClick={handleSignOut} className="signout-button" disabled={loading}>
              {loading ? '로그아웃 중...' : '로그아웃'}
            </button>
          </div>
        )}
      </div>
      
      <div className={`chat-area ${!isSidebarOpen ? 'sidebar-closed' : ''}`}>
        <div className="chat-header">
          <div className="chat-header-left">
            <h3>{activeChannel}</h3>
          </div>
          <div className="chat-header-right">
            <button onClick={onGoBack} className="back-button-community">홈으로</button>
          </div>
        </div>
        
        <div className="messages-list" ref={messagesContainerRef}>
          {renderContent()}
        </div>
        
        <div className="chat-input-box">
          {session ? (
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
          ) : (
            renderAuth()
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunityPage;