import React, { useState, useEffect, useRef } from 'react';

export default function CompleteSchoolChat() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Login page states
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    teacher: '',
    school: ''
  });
  const [showOtherSchoolSurvey, setShowOtherSchoolSurvey] = useState(false);
  const [otherSchool, setOtherSchool] = useState('');
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [showReturningSlide, setShowReturningSlide] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [signInData, setSignInData] = useState({
    name: '',
    password: ''
  });
  const [errorMessage, setErrorMessage] = useState('');

  // Chat app states
  const [activeChannel, setActiveChannel] = useState('general');
  const [activeView, setActiveView] = useState('channels');
  const [messages, setMessages] = useState({});
  const [messageInput, setMessageInput] = useState('');
  const [showUserList, setShowUserList] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [channels, setChannels] = useState([
    { id: 'general', name: 'general', icon: '💬' },
    { id: 'homework-help', name: 'homework-help', icon: '📚' },
    { id: 'off-topic', name: 'off-topic', icon: '🎮' },
    { id: 'announcements', name: 'announcements', icon: '📢' },
    { id: 'study-groups', name: 'study-groups', icon: '👥' }
  ]);
  const [dmConversations, setDmConversations] = useState([]);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const messagesEndRef = useRef(null);

  // Auto slide-out after 3 seconds
  useEffect(() => {
    if (!isLoggedIn) {
      const timer = setTimeout(() => {
        setShowReturningSlide(true);
        setTimeout(() => {
          setShowReturningSlide(false);
        }, 4000);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn]);

  // Chat initialization
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      loadMessages();
      loadOnlineUsers();
      loadDMs();
      markUserOnline();

      return () => {
        markUserOffline();
      };
    }
  }, [isLoggedIn, currentUser]);

  useEffect(() => {
    if (isLoggedIn) {
      scrollToBottom();
    }
  }, [messages, activeChannel, isLoggedIn]);

  // Login handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSignIn = async () => {
    setErrorMessage('');
    
    if (!signInData.name || !signInData.password) {
      setErrorMessage('Please enter both name and password');
      return;
    }

    try {
      const accountKey = `user:${signInData.name.toLowerCase().trim()}`;
      const result = await window.storage.get(accountKey);
      
      if (!result) {
        setErrorMessage('Account not found. Please check your name or create a new account.');
        return;
      }

      const userData = JSON.parse(result.value);
      
      if (userData.password !== signInData.password) {
        setErrorMessage('Incorrect password. Please try again.');
        return;
      }

      setCurrentUser(userData);
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Sign in error:', error);
      setErrorMessage('Account not found. Please create a new account.');
    }
  };

  const handleContinue = () => {
    if (!formData.name || !formData.grade || !formData.teacher || !formData.school) {
      alert('Please fill in all fields before continuing');
      return;
    }

    if (formData.school === 'other') {
      setShowOtherSchoolSurvey(true);
    } else {
      setNeedsPassword(true);
    }
  };

  const handleSurveySubmit = () => {
    if (!otherSchool.trim()) {
      alert('Please tell us which school you attend');
      return;
    }
    setNeedsPassword(true);
  };

  const handleCreatePassword = async () => {
    setErrorMessage('');
    
    if (!password || !confirmPassword) {
      setErrorMessage('Please fill in both password fields');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    try {
      const accountKey = `user:${formData.name.toLowerCase().trim()}`;
      
      try {
        const existingAccount = await window.storage.get(accountKey);
        if (existingAccount) {
          setErrorMessage('An account with this name already exists. Please use a different name or sign in.');
          return;
        }
      } catch (error) {
        // Account doesn't exist, which is what we want
      }

      const userData = {
        name: formData.name,
        grade: formData.grade,
        teacher: formData.teacher,
        school: formData.school === 'other' ? otherSchool : formData.school,
        password: password,
        createdAt: new Date().toISOString()
      };

      await window.storage.set(accountKey, JSON.stringify(userData));
      
      setCurrentUser(userData);
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Account creation error:', error);
      setErrorMessage('Error creating account. Please try again.');
    }
  };

  // Chat handlers
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const allMessages = {};
      for (const channel of channels) {
        const result = await window.storage.get(`messages:${channel.id}`, true);
        if (result) {
          allMessages[channel.id] = JSON.parse(result.value);
        } else {
          allMessages[channel.id] = [];
        }
      }
      setMessages(allMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      const allMessages = {};
      channels.forEach(channel => {
        allMessages[channel.id] = [];
      });
      setMessages(allMessages);
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const result = await window.storage.get('online-users', true);
      if (result) {
        setOnlineUsers(JSON.parse(result.value));
      } else {
        setOnlineUsers([currentUser.name]);
      }
    } catch (error) {
      setOnlineUsers([currentUser.name]);
    }
  };

  const loadDMs = async () => {
    try {
      const result = await window.storage.get(`dms:${currentUser.name.toLowerCase()}`);
      if (result) {
        setDmConversations(JSON.parse(result.value));
      }
    } catch (error) {
      console.error('Error loading DMs:', error);
    }
  };

  const markUserOnline = async () => {
    try {
      const result = await window.storage.get('online-users', true);
      let users = result ? JSON.parse(result.value) : [];
      if (!users.includes(currentUser.name)) {
        users.push(currentUser.name);
        await window.storage.set('online-users', JSON.stringify(users), true);
        setOnlineUsers(users);
      }
    } catch (error) {
      console.error('Error marking online:', error);
    }
  };

  const markUserOffline = async () => {
    try {
      const result = await window.storage.get('online-users', true);
      if (result) {
        let users = JSON.parse(result.value);
        users = users.filter(u => u !== currentUser.name);
        await window.storage.set('online-users', JSON.stringify(users), true);
      }
    } catch (error) {
      console.error('Error marking offline:', error);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim()) return;

    const newMessage = {
      id: Date.now(),
      user: currentUser.name,
      text: messageInput,
      timestamp: new Date().toISOString(),
      channel: activeChannel
    };

    const channelMessages = messages[activeChannel] || [];
    const updatedMessages = [...channelMessages, newMessage];

    setMessages(prev => ({
      ...prev,
      [activeChannel]: updatedMessages
    }));

    try {
      await window.storage.set(`messages:${activeChannel}`, JSON.stringify(updatedMessages), true);
    } catch (error) {
      console.error('Error saving message:', error);
    }

    setMessageInput('');
  };

  const createChannel = async () => {
    if (!newChannelName.trim()) return;

    const channelId = newChannelName.toLowerCase().replace(/\s+/g, '-');
    const newChannel = {
      id: channelId,
      name: channelId,
      icon: '💬'
    };

    setChannels([...channels, newChannel]);
    setMessages(prev => ({
      ...prev,
      [channelId]: []
    }));
    setNewChannelName('');
    setShowCreateChannel(false);
    setActiveChannel(channelId);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setFormData({ name: '', grade: '', teacher: '', school: '' });
    setSignInData({ name: '', password: '' });
    setPassword('');
    setConfirmPassword('');
    setNeedsPassword(false);
    setShowOtherSchoolSurvey(false);
    setIsReturningUser(false);
    setErrorMessage('');
  };

  // Render chat app if logged in
  if (isLoggedIn && currentUser) {
    const currentMessages = messages[activeChannel] || [];

    return (
      <div style={{
        height: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#fff',
        overflow: 'hidden'
      }}>
        {/* Left Sidebar - Channels */}
        <div style={{
          width: '240px',
          background: '#111',
          borderRight: '1px solid rgba(139, 38, 53, 0.2)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid rgba(139, 38, 53, 0.2)',
            fontWeight: '700',
            fontSize: '16px',
            background: 'linear-gradient(135deg, rgba(139, 38, 53, 0.1) 0%, transparent 100%)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #8B2635 0%, #C73E4A 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}>
              🏫
            </div>
            <span>{currentUser.school}</span>
          </div>

          <div style={{
            display: 'flex',
            padding: '12px',
            gap: '8px',
            borderBottom: '1px solid rgba(139, 38, 53, 0.2)'
          }}>
            <button
              onClick={() => setActiveView('channels')}
              style={{
                flex: 1,
                padding: '8px',
                background: activeView === 'channels' ? 'rgba(139, 38, 53, 0.3)' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: activeView === 'channels' ? '#fff' : '#888',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
            >
              Channels
            </button>
            <button
              onClick={() => setActiveView('dms')}
              style={{
                flex: 1,
                padding: '8px',
                background: activeView === 'dms' ? 'rgba(139, 38, 53, 0.3)' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: activeView === 'dms' ? '#fff' : '#888',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
            >
              DMs
            </button>
          </div>

          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px'
          }}>
            {activeView === 'channels' ? (
              <>
                {channels.map(channel => (
                  <div
                    key={channel.id}
                    onClick={() => setActiveChannel(channel.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      marginBottom: '2px',
                      background: activeChannel === channel.id ? 'rgba(139, 38, 53, 0.3)' : 'transparent',
                      color: activeChannel === channel.id ? '#fff' : '#888',
                      fontSize: '15px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (activeChannel !== channel.id) {
                        e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.target.style.color = '#fff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeChannel !== channel.id) {
                        e.target.style.background = 'transparent';
                        e.target.style.color = '#888';
                      }
                    }}
                  >
                    <span>{channel.icon}</span>
                    <span>{channel.name}</span>
                  </div>
                ))}
                <button
                  onClick={() => setShowCreateChannel(true)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'transparent',
                    border: '1px dashed rgba(139, 38, 53, 0.4)',
                    borderRadius: '6px',
                    color: '#888',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginTop: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = '#8B2635';
                    e.target.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = 'rgba(139, 38, 53, 0.4)';
                    e.target.style.color = '#888';
                  }}
                >
                  + Create Channel
                </button>
              </>
            ) : (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: '#666',
                fontSize: '14px'
              }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
                <p>No direct messages yet</p>
                <p style={{ fontSize: '12px', marginTop: '8px' }}>
                  Click on a user to start a conversation
                </p>
              </div>
            )}
          </div>

          <div style={{
            padding: '12px',
            borderTop: '1px solid rgba(139, 38, 53, 0.2)',
            background: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8B2635 0%, #C73E4A 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: '700',
              position: 'relative'
            }}>
              {currentUser.name.charAt(0).toUpperCase()}
              <div style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#3ba55c',
                border: '2px solid #111'
              }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#fff',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {currentUser.name}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#888'
              }}>
                Online
              </div>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '4px',
                borderRadius: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                e.target.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#888';
              }}
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Main Chat Area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: '#0d0d0d'
        }}>
          <div style={{
            height: '60px',
            borderBottom: '1px solid rgba(139, 38, 53, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            background: 'rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '20px' }}>
                {channels.find(c => c.id === activeChannel)?.icon || '💬'}
              </span>
              <span style={{
                fontSize: '16px',
                fontWeight: '700'
              }}>
                {channels.find(c => c.id === activeChannel)?.name || activeChannel}
              </span>
            </div>
            <button
              onClick={() => setShowUserList(!showUserList)}
              style={{
                padding: '8px 16px',
                background: showUserList ? 'rgba(139, 38, 53, 0.3)' : 'transparent',
                border: '1px solid rgba(139, 38, 53, 0.4)',
                borderRadius: '6px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#8B2635';
                e.target.style.background = 'rgba(139, 38, 53, 0.3)';
              }}
              onMouseLeave={(e) => {
                if (!showUserList) {
                  e.target.style.background = 'transparent';
                }
                e.target.style.borderColor = 'rgba(139, 38, 53, 0.4)';
              }}
            >
              👥 {onlineUsers.length}
            </button>
          </div>

          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {currentMessages.length === 0 ? (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  background: 'linear-gradient(135deg, #8B2635 0%, #C73E4A 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '40px',
                  marginBottom: '20px',
                  opacity: 0.3
                }}>
                  {channels.find(c => c.id === activeChannel)?.icon || '💬'}
                </div>
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  marginBottom: '8px',
                  color: '#fff'
                }}>
                  Welcome to #{channels.find(c => c.id === activeChannel)?.name}
                </h3>
                <p style={{ fontSize: '15px' }}>
                  This is the start of the conversation. Say hi!
                </p>
              </div>
            ) : (
              <>
                {currentMessages.map((msg, index) => {
                  const showDate = index === 0 || 
                    formatDate(msg.timestamp) !== formatDate(currentMessages[index - 1].timestamp);
                  const showUser = index === 0 || 
                    currentMessages[index - 1].user !== msg.user ||
                    new Date(msg.timestamp) - new Date(currentMessages[index - 1].timestamp) > 300000;

                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div style={{
                          textAlign: 'center',
                          margin: '20px 0 10px',
                          position: 'relative'
                        }}>
                          <div style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            background: 'rgba(139, 38, 53, 0.2)',
                            border: '1px solid rgba(139, 38, 53, 0.3)',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#888'
                          }}>
                            {formatDate(msg.timestamp)}
                          </div>
                        </div>
                      )}
                      {showUser ? (
                        <div style={{
                          display: 'flex',
                          gap: '12px',
                          marginBottom: '16px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                        >
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #8B2635 0%, #C73E4A 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            fontWeight: '700',
                            flexShrink: 0
                          }}>
                            {msg.user.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'baseline',
                              gap: '8px',
                              marginBottom: '4px'
                            }}>
                              <span style={{
                                fontSize: '15px',
                                fontWeight: '600',
                                color: '#fff'
                              }}>
                                {msg.user}
                              </span>
                              <span style={{
                                fontSize: '12px',
                                color: '#666'
                              }}>
                                {formatTime(msg.timestamp)}
                              </span>
                            </div>
                            <div style={{
                              fontSize: '15px',
                              color: '#ddd',
                              lineHeight: '1.5',
                              wordWrap: 'break-word'
                            }}>
                              {msg.text}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          marginLeft: '52px',
                          marginBottom: '4px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                        >
                          <div style={{
                            fontSize: '15px',
                            color: '#ddd',
                            lineHeight: '1.5',
                            wordWrap: 'break-word'
                          }}>
                            {msg.text}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <div style={{
            padding: '20px',
            borderTop: '1px solid rgba(139, 38, 53, 0.2)',
            background: 'rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              gap: '12px',
              background: '#1a1a1a',
              borderRadius: '12px',
              padding: '12px 16px',
              border: '1px solid rgba(139, 38, 53, 0.3)'
            }}>
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={`Message #${channels.find(c => c.id === activeChannel)?.name || activeChannel}`}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: '15px',
                  fontFamily: "'DM Sans', sans-serif"
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!messageInput.trim()}
                style={{
                  padding: '8px 20px',
                  background: messageInput.trim() ? 'linear-gradient(135deg, #8B2635 0%, #C73E4A 100%)' : 'rgba(139, 38, 53, 0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  color: messageInput.trim() ? '#fff' : '#666',
                  cursor: messageInput.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  fontFamily: "'DM Sans', sans-serif"
                }}
                onMouseEnter={(e) => {
                  if (messageInput.trim()) {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 15px rgba(139, 38, 53, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                Send
              </button>
            </div>
            <div style={{
              marginTop: '8px',
              fontSize: '12px',
              color: '#666',
              display: 'flex',
              gap: '12px'
            }}>
              <span>Press Enter to send</span>
              <span>•</span>
              <span>Shift + Enter for new line</span>
            </div>
          </div>
        </div>

        {/* Right Sidebar - User List */}
        {showUserList && (
          <div style={{
            width: '240px',
            background: '#111',
            borderLeft: '1px solid rgba(139, 38, 53, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideInRight 0.2s ease-out'
          }}>
            <div style={{
              padding: '16px',
              borderBottom: '1px solid rgba(139, 38, 53, 0.2)',
              fontWeight: '700',
              fontSize: '14px',
              color: '#888'
            }}>
              MEMBERS — {onlineUsers.length}
            </div>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px'
            }}>
              {onlineUsers.map((user, index) => (
                <div
                  key={index}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '2px',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8B2635 0%, #C73E4A 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '700',
                    position: 'relative',
                    flexShrink: 0
                  }}>
                    {user.charAt(0).toUpperCase()}
                    <div style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#3ba55c',
                      border: '2px solid #111'
                    }} />
                  </div>
                  <div style={{
                    flex: 1,
                    minWidth: 0
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#fff',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {user}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#888'
                    }}>
                      Online
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Channel Modal */}
        {showCreateChannel && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{
              background: '#1a1a1a',
              borderRadius: '16px',
              padding: '32px',
              width: '90%',
              maxWidth: '440px',
              border: '1px solid rgba(139, 38, 53, 0.3)',
              animation: 'scaleIn 0.2s ease-out'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                marginBottom: '8px',
                color: '#fff'
              }}>
                Create Channel
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#888',
                marginBottom: '24px'
              }}>
                Channels are where your team communicates
              </p>
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#aaa'
                }}>
                  CHANNEL NAME
                </label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g., math-help"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#0d0d0d',
                    border: '1px solid rgba(139, 38, 53, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '15px',
                    outline: 'none',
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      createChannel();
                    }
                  }}
                />
              </div>
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => {
                    setShowCreateChannel(false);
                    setNewChannelName('');
                  }}
                  style={{
                    padding: '10px 20px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#888',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={createChannel}
                  disabled={!newChannelName.trim()}
                  style={{
                    padding: '10px 20px',
                    background: newChannelName.trim() ? 'linear-gradient(135deg, #8B2635 0%, #C73E4A 100%)' : 'rgba(139, 38, 53, 0.2)',
                    border: 'none',
                    borderRadius: '8px',
                    color: newChannelName.trim() ? '#fff' : '#666',
                    cursor: newChannelName.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    fontWeight: '600',
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                >
                  Create Channel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{
              background: '#1a1a1a',
              borderRadius: '16px',
              padding: '32px',
              width: '90%',
              maxWidth: '500px',
              border: '1px solid rgba(139, 38, 53, 0.3)',
              animation: 'scaleIn 0.2s ease-out'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                marginBottom: '24px',
                color: '#fff'
              }}>
                User Settings
              </h2>
              <div style={{
                background: 'rgba(139, 38, 53, 0.1)',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '24px',
                border: '1px solid rgba(139, 38, 53, 0.2)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8B2635 0%, #C73E4A 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    fontWeight: '700'
                  }}>
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#fff',
                      marginBottom: '4px'
                    }}>
                      {currentUser.name}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#888'
                    }}>
                      {currentUser.grade} • {currentUser.teacher}
                    </div>
                  </div>
                </div>
                <div style={{
                  padding: '12px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#aaa'
                }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong style={{ color: '#fff' }}>School:</strong> {currentUser.school}
                  </div>
                  <div>
                    <strong style={{ color: '#fff' }}>Status:</strong> <span style={{ color: '#3ba55c' }}>● Online</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowSettings(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'rgba(139, 38, 53, 0.2)',
                    border: '1px solid rgba(139, 38, 53, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                >
                  Close
                </button>
                <button
                  onClick={handleLogout}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'linear-gradient(135deg, #8B2635 0%, #C73E4A 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
          }

          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }

          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }

          ::-webkit-scrollbar-track {
            background: transparent;
          }

          ::-webkit-scrollbar-thumb {
            background: rgba(139, 38, 53, 0.4);
            borderRadius: 4px;
          }

          ::-webkit-scrollbar-thumb:hover {
            background: rgba(139, 38, 53, 0.6);
          }
        `}</style>
      </div>
    );
  }

  // Render login page if not logged in
  if (needsPassword) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#fff',
        padding: '20px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '480px',
          background: 'rgba(20, 20, 20, 0.8)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '48px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 1px rgba(139, 38, 53, 0.5)',
          border: '1px solid rgba(139, 38, 53, 0.2)',
          animation: 'slideIn 0.4s ease-out'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #8B2635 0%, #C73E4A 100%)',
            borderRadius: '16px',
            margin: '0 auto 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '30px'
          }}>
            🔒
          </div>
          
          <h2 style={{
            fontSize: '28px',
            fontWeight: '700',
            marginBottom: '12px',
            textAlign: 'center',
            fontFamily: "'Playfair Display', serif"
          }}>
            Create Your Password
          </h2>
          
          <p style={{
            fontSize: '16px',
            color: '#888',
            marginBottom: '32px',
            textAlign: 'center'
          }}>
            Make a password for your account
          </p>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
              color: '#aaa'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                background: 'rgba(30, 30, 30, 0.6)',
                border: '2px solid rgba(139, 38, 53, 0.3)',
                borderRadius: '12px',
                color: '#fff',
                outline: 'none',
                transition: 'all 0.3s ease',
                fontFamily: "'DM Sans', sans-serif"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#8B2635';
                e.target.style.background = 'rgba(30, 30, 30, 0.9)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(139, 38, 53, 0.3)';
                e.target.style.background = 'rgba(30, 30, 30, 0.6)';
              }}
            />
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
              color: '#aaa'
            }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreatePassword();
                }
              }}
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                background: 'rgba(30, 30, 30, 0.6)',
                border: '2px solid rgba(139, 38, 53, 0.3)',
                borderRadius: '12px',
                color: '#fff',
                outline: 'none',
                transition: 'all 0.3s ease',
                fontFamily: "'DM Sans', sans-serif"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#8B2635';
                e.target.style.background = 'rgba(30, 30, 30, 0.9)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(139, 38, 53, 0.3)';
                e.target.style.background = 'rgba(30, 30, 30, 0.6)';
              }}
            />
          </div>

          {errorMessage && (
            <div style={{
              marginBottom: '24px',
              padding: '14px 16px',
              background: 'rgba(199, 62, 74, 0.15)',
              border: '1px solid rgba(199, 62, 74, 0.4)',
              borderRadius: '10px',
              fontSize: '14px',
              color: '#ff6b7a',
              animation: 'shake 0.4s ease-in-out'
            }}>
              ⚠️ {errorMessage}
            </div>
          )}

          <button
            onClick={handleCreatePassword}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #8B2635 0%, #C73E4A 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 20px rgba(139, 38, 53, 0.4)',
              fontFamily: "'DM Sans', sans-serif"
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 30px rgba(139, 38, 53, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 20px rgba(139, 38, 53, 0.4)';
            }}
          >
            Create Account
          </button>
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@700&display=swap');
          
          @keyframes slideIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-8px); }
            75% { transform: translateX(8px); }
          }
        `}</style>
      </div>
    );
  }

  if (isReturningUser) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#fff',
        padding: '20px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '480px',
          background: 'rgba(20, 20, 20, 0.8)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '48px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 1px rgba(139, 38, 53, 0.5)',
          border: '1px solid rgba(139, 38, 53, 0.2)',
          animation: 'slideIn 0.4s ease-out'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #8B2635 0%, #C73E4A 100%)',
            borderRadius: '20px',
            margin: '0 auto 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px',
            boxShadow: '0 10px 40px rgba(139, 38, 53, 0.3)'
          }}>
            💬
          </div>

          <h2 style={{
            fontSize: '28px',
            fontWeight: '700',
            marginBottom: '12px',
            textAlign: 'center',
            fontFamily: "'Playfair Display', serif"
          }}>
            Let's go back here!
          </h2>
          
          <p style={{
            fontSize: '16px',
            color: '#888',
            marginBottom: '32px',
            textAlign: 'center'
          }}>
            Sign in to your account
          </p>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
              color: '#aaa'
            }}>
              Name
            </label>
            <input
              type="text"
              value={signInData.name}
              onChange={(e) => setSignInData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter your name"
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                background: 'rgba(30, 30, 30, 0.6)',
                border: '2px solid rgba(139, 38, 53, 0.3)',
                borderRadius: '12px',
                color: '#fff',
                outline: 'none',
                transition: 'all 0.3s ease',
                fontFamily: "'DM Sans', sans-serif"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#8B2635';
                e.target.style.background = 'rgba(30, 30, 30, 0.9)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(139, 38, 53, 0.3)';
                e.target.style.background = 'rgba(30, 30, 30, 0.6)';
              }}
            />
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
              color: '#aaa'
            }}>
              Password
            </label>
            <input
              type="password"
              value={signInData.password}
              onChange={(e) => setSignInData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Enter your password"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSignIn();
                }
              }}
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                background: 'rgba(30, 30, 30, 0.6)',
                border: '2px solid rgba(139, 38, 53, 0.3)',
                borderRadius: '12px',
                color: '#fff',
                outline: 'none',
                transition: 'all 0.3s ease',
                fontFamily: "'DM Sans', sans-serif"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#8B2635';
                e.target.style.background = 'rgba(30, 30, 30, 0.9)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(139, 38, 53, 0.3)';
                e.target.style.background = 'rgba(30, 30, 30, 0.6)';
              }}
            />
          </div>

          {errorMessage && (
            <div style={{
              marginBottom: '24px',
              padding: '14px 16px',
              background: 'rgba(199, 62, 74, 0.15)',
              border: '1px solid rgba(199, 62, 74, 0.4)',
              borderRadius: '10px',
              fontSize: '14px',
              color: '#ff6b7a',
              animation: 'shake 0.4s ease-in-out'
            }}>
              ⚠️ {errorMessage}
            </div>
          )}

          <button
            onClick={handleSignIn}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #8B2635 0%, #C73E4A 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 20px rgba(139, 38, 53, 0.4)',
              fontFamily: "'DM Sans', sans-serif"
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 30px rgba(139, 38, 53, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 20px rgba(139, 38, 53, 0.4)';
            }}
          >
            Sign In
          </button>

          <button
            onClick={() => {
              setErrorMessage('');
              setIsReturningUser(false);
            }}
            style={{
              width: '100%',
              padding: '12px',
              marginTop: '16px',
              fontSize: '14px',
              fontWeight: '500',
              background: 'transparent',
              border: '1px solid rgba(139, 38, 53, 0.3)',
              borderRadius: '12px',
              color: '#888',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontFamily: "'DM Sans', sans-serif"
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#8B2635';
              e.target.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = 'rgba(139, 38, 53, 0.3)';
              e.target.style.color = '#888';
            }}
          >
            ← Back to Sign Up
          </button>
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@700&display=swap');
          
          @keyframes slideIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-8px); }
            75% { transform: translateX(8px); }
          }
        `}</style>
      </div>
    );
  }

  if (showOtherSchoolSurvey) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#fff',
        padding: '20px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '480px',
          background: 'rgba(20, 20, 20, 0.8)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '48px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 1px rgba(139, 38, 53, 0.5)',
          border: '1px solid rgba(139, 38, 53, 0.2)',
          animation: 'slideIn 0.4s ease-out'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #8B2635 0%, #C73E4A 100%)',
            borderRadius: '16px',
            margin: '0 auto 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '30px'
          }}>
            📋
          </div>
          
          <h2 style={{
            fontSize: '28px',
            fontWeight: '700',
            marginBottom: '12px',
            textAlign: 'center',
            fontFamily: "'Playfair Display', serif"
          }}>
            Quick Survey
          </h2>
          
          <p style={{
            fontSize: '16px',
            color: '#888',
            marginBottom: '32px',
            textAlign: 'center'
          }}>
            Help us know your school community better
          </p>

          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
              color: '#aaa'
            }}>
              Which school do you attend?
            </label>
            <input
              type="text"
              value={otherSchool}
              onChange={(e) => setOtherSchool(e.target.value)}
              placeholder="Enter your school name"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSurveySubmit();
                }
              }}
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                background: 'rgba(30, 30, 30, 0.6)',
                border: '2px solid rgba(139, 38, 53, 0.3)',
                borderRadius: '12px',
                color: '#fff',
                outline: 'none',
                transition: 'all 0.3s ease',
                fontFamily: "'DM Sans', sans-serif"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#8B2635';
                e.target.style.background = 'rgba(30, 30, 30, 0.9)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(139, 38, 53, 0.3)';
                e.target.style.background = 'rgba(30, 30, 30, 0.6)';
              }}
            />
          </div>

          <button
            onClick={handleSurveySubmit}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #8B2635 0%, #C73E4A 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 20px rgba(139, 38, 53, 0.4)',
              fontFamily: "'DM Sans', sans-serif"
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 30px rgba(139, 38, 53, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 20px rgba(139, 38, 53, 0.4)';
            }}
          >
            Complete Survey
          </button>
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@700&display=swap');
          
          @keyframes slideIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    );
  }

  // Default: Main signup page
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      color: '#fff',
      padding: '20px',
      position: 'relative'
    }}>
      <div 
        onMouseEnter={() => setShowReturningSlide(true)}
        onMouseLeave={() => setShowReturningSlide(false)}
        style={{
          position: 'fixed',
          right: showReturningSlide ? '0' : '-200px',
          top: '50%',
          transform: 'translateY(-50%)',
          transition: 'right 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 1000
        }}
      >
        <div style={{
          background: 'linear-gradient(135deg, #8B2635 0%, #C73E4A 100%)',
          padding: '20px 28px',
          borderRadius: '16px 0 0 16px',
          boxShadow: '-4px 4px 20px rgba(139, 38, 53, 0.5)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '240px'
        }}
        onClick={() => {
          setErrorMessage('');
          setIsReturningUser(true);
        }}
        >
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#fff',
            whiteSpace: 'nowrap'
          }}>
            👋 Been here before?
          </div>
        </div>
      </div>

      <div style={{
        position: 'absolute',
        top: '10%',
        left: '10%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(139, 38, 53, 0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '15%',
        right: '15%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(139, 38, 53, 0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(80px)',
        pointerEvents: 'none'
      }} />

      <div 
        onMouseEnter={() => setShowReturningSlide(true)}
        style={{
        width: '100%',
        maxWidth: '480px',
        background: 'rgba(20, 20, 20, 0.8)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: '48px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 1px rgba(139, 38, 53, 0.5)',
        border: '1px solid rgba(139, 38, 53, 0.2)',
        position: 'relative',
        animation: 'slideIn 0.5s ease-out'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #8B2635 0%, #C73E4A 100%)',
          borderRadius: '20px',
          margin: '0 auto 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '40px',
          boxShadow: '0 10px 40px rgba(139, 38, 53, 0.3)',
          animation: 'float 3s ease-in-out infinite'
        }}>
          💬
        </div>

        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          marginBottom: '8px',
          textAlign: 'center',
          fontFamily: "'Playfair Display', serif",
          background: 'linear-gradient(135deg, #fff 0%, #ddd 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Welcome!
        </h1>
        
        <p style={{
          fontSize: '16px',
          color: '#888',
          marginBottom: '40px',
          textAlign: 'center'
        }}>
          Sign in to join your school community
        </p>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '8px',
            color: '#aaa'
          }}>
            Full Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter your name"
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              background: 'rgba(30, 30, 30, 0.6)',
              border: '2px solid rgba(139, 38, 53, 0.3)',
              borderRadius: '12px',
              color: '#fff',
              outline: 'none',
              transition: 'all 0.3s ease',
              fontFamily: "'DM Sans', sans-serif"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#8B2635';
              e.target.style.background = 'rgba(30, 30, 30, 0.9)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(139, 38, 53, 0.3)';
              e.target.style.background = 'rgba(30, 30, 30, 0.6)';
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '8px',
            color: '#aaa'
          }}>
            Grade
          </label>
          <input
            type="text"
            name="grade"
            value={formData.grade}
            onChange={handleInputChange}
            placeholder="e.g., 9th, 10th, 11th"
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              background: 'rgba(30, 30, 30, 0.6)',
              border: '2px solid rgba(139, 38, 53, 0.3)',
              borderRadius: '12px',
              color: '#fff',
              outline: 'none',
              transition: 'all 0.3s ease',
              fontFamily: "'DM Sans', sans-serif"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#8B2635';
              e.target.style.background = 'rgba(30, 30, 30, 0.9)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(139, 38, 53, 0.3)';
              e.target.style.background = 'rgba(30, 30, 30, 0.6)';
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '8px',
            color: '#aaa'
          }}>
            Teacher
          </label>
          <input
            type="text"
            name="teacher"
            value={formData.teacher}
            onChange={handleInputChange}
            placeholder="Teacher's name"
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              background: 'rgba(30, 30, 30, 0.6)',
              border: '2px solid rgba(139, 38, 53, 0.3)',
              borderRadius: '12px',
              color: '#fff',
              outline: 'none',
              transition: 'all 0.3s ease',
              fontFamily: "'DM Sans', sans-serif"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#8B2635';
              e.target.style.background = 'rgba(30, 30, 30, 0.9)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(139, 38, 53, 0.3)';
              e.target.style.background = 'rgba(30, 30, 30, 0.6)';
            }}
          />
        </div>

        <div style={{ marginBottom: '32px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '8px',
            color: '#aaa'
          }}>
            School
          </label>
          <select
            name="school"
            value={formData.school}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              background: 'rgba(30, 30, 30, 0.6)',
              border: '2px solid rgba(139, 38, 53, 0.3)',
              borderRadius: '12px',
              color: formData.school ? '#fff' : '#666',
              outline: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontFamily: "'DM Sans', sans-serif"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#8B2635';
              e.target.style.background = 'rgba(30, 30, 30, 0.9)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(139, 38, 53, 0.3)';
              e.target.style.background = 'rgba(30, 30, 30, 0.6)';
            }}
          >
            <option value="" style={{ background: '#1a1a1a' }}>Select your school</option>
            <option value="GES (Gardendale)" style={{ background: '#1a1a1a' }}>GES (Gardendale)</option>
            <option value="MOES (Mount Olive)" style={{ background: '#1a1a1a' }}>MOES (Mount Olive)</option>
            <option value="JCIB" style={{ background: '#1a1a1a' }}>JCIB</option>
            <option value="other" style={{ background: '#1a1a1a' }}>Other</option>
          </select>
        </div>

        <button
          onClick={handleContinue}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            fontWeight: '600',
            background: 'linear-gradient(135deg, #8B2635 0%, #C73E4A 100%)',
            border: 'none',
            borderRadius: '12px',
            color: '#fff',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 20px rgba(139, 38, 53, 0.4)',
            fontFamily: "'DM Sans', sans-serif"
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 8px 30px rgba(139, 38, 53, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 20px rgba(139, 38, 53, 0.4)';
          }}
        >
          Continue
        </button>

        <div style={{
          marginTop: '40px',
          paddingTop: '24px',
          borderTop: '1px solid rgba(139, 38, 53, 0.2)',
          textAlign: 'center',
          fontSize: '12px',
          color: '#555'
        }}>
          <p style={{ margin: '4px 0' }}>Created with Claude</p>
          <p style={{ margin: '4px 0' }}>Inspired by Discord</p>
          <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#666' }}>Your account info is securely saved</p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@700&display=swap');
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }

        input::placeholder,
        select {
          color: #666;
        }

        select option {
          padding: 12px;
        }
      `}</style>
    </div>
  );
}
