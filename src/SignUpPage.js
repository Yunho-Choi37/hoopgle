import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import './SignUpPage.css';

const SignUpPage = ({ onSignUpSuccess, onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [nicknameStatus, setNicknameStatus] = useState(''); // '', 'checking', 'available', 'taken', 'error'
  const [error, setError] = useState('');

  const handleNicknameCheck = async () => {
    if (!nickname || nickname.length < 2) {
      setNicknameStatus('error');
      setError('닉네임은 2자 이상이어야 합니다.');
      return;
    }
    setNicknameStatus('checking');
    setError('');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', nickname)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116: 'exact one row expected, but 0 rows returned'
        throw error;
      }

      if (data) {
        setNicknameStatus('taken');
      } else {
        setNicknameStatus('available');
      }
    } catch (error) {
      setNicknameStatus('error');
      setError('닉네임 확인 중 오류가 발생했습니다.');
      console.error('Nickname check error:', error);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (nicknameStatus !== 'available') {
      setError('닉네임 중복 확인을 해주세요.');
      return;
    }
    if (!ageConfirmed) {
      setError('만 14세 이상 확인이 필요합니다.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            username: nickname,
          },
        },
      });

      if (error) throw error;

      // 회원가입 성공 후 profiles 테이블에 사용자 정보 저장
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              username: nickname,
              email: email,
              avatar_url: '/default-avatar.png'
            }
          ]);

        if (profileError) {
          console.error('Error creating profile:', profileError);
        }
      }

      onSignUpSuccess(); // Show success message in the parent component

    } catch (error) {
      setError(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = loading || nicknameStatus !== 'available' || !ageConfirmed || !email || password.length < 6 || password !== confirmPassword;

  return (
    <div className="signup-page-container">
      <div className="signup-form-wrapper">
        <div className="signup-title-container">
          <h1 className="signup-title-main">
            <span className="hoopgle-red">H</span><span className="hoopgle-yellow">o</span><span className="hoopgle-navy">o</span><span className="hoopgle-yellow">p</span><span className="hoopgle-navy">d</span><span className="hoopgle-yellow">e</span><span className="hoopgle-navy">x</span>
          </h1>
          <h2 className="signup-title-sub">회원가입</h2>
        </div>
        <form onSubmit={handleSignUp}>
          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="이메일 주소"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="6자리 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">비밀번호 확인</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="비밀번호 재입력"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="feedback-msg error">비밀번호가 일치하지 않습니다.</p>
            )}
            {confirmPassword && password === confirmPassword && (
              <p className="feedback-msg success">비밀번호가 일치합니다.</p>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="nickname">닉네임</label>
            <div className="nickname-wrapper">
              <input
                id="nickname"
                name="nickname"
                type="text"
                placeholder="2자 이상"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setNicknameStatus(''); // Reset status on change
                }}
                required
              />
              <button type="button" onClick={handleNicknameCheck} disabled={!nickname || nickname.length < 2 || nicknameStatus === 'checking'} className="nickname-check-btn">
                {nicknameStatus === 'checking' ? '확인중' : '중복확인'}
              </button>
            </div>
            {nicknameStatus === 'available' && <p className="feedback-msg success">사용 가능한 닉네임입니다.</p>}
            {nicknameStatus === 'taken' && <p className="feedback-msg error">이미 사용 중인 닉네임입니다.</p>}
          </div>

          <div className="form-group-checkbox">
            <input
              id="age-confirm"
              name="age-confirm"
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
            />
            <label htmlFor="age-confirm">본인은 만 14세 이상입니다. (필수)</label>
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="signup-submit-btn" disabled={isSubmitDisabled}>
            {loading ? '가입하는 중...' : '가입하기'}
          </button>
        </form>
        <div className="back-to-login-wrapper">
          <button onClick={onBackToLogin} className="back-to-login-btn">
            &larr; 로그인 화면으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
