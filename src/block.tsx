import React, { useState, useEffect, useRef } from 'react';

interface BlockProps {
  title?: string;
  description?: string;
}

interface Pattern {
  id: number;
  sequence: ('clap' | 'stomp')[];
  name: string;
  difficulty: number;
}

const Block: React.FC<BlockProps> = ({ title, description }) => {
  const [gamePhase, setGamePhase] = useState<'intro' | 'watch' | 'practice' | 'challenge' | 'complete'>('intro');
  const [currentPattern, setCurrentPattern] = useState<Pattern | null>(null);
  const [userPattern, setUserPattern] = useState<('clap' | 'stomp')[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [feedback, setFeedback] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const patterns: Pattern[] = [
    { id: 1, sequence: ['clap', 'clap'], name: 'Double Clap', difficulty: 1 },
    { id: 2, sequence: ['clap', 'stomp'], name: 'Clap-Stomp', difficulty: 1 },
    { id: 3, sequence: ['clap', 'clap', 'stomp'], name: 'Two Claps & Stomp', difficulty: 2 },
    { id: 4, sequence: ['stomp', 'clap', 'clap'], name: 'Stomp & Two Claps', difficulty: 2 },
    { id: 5, sequence: ['clap', 'stomp', 'clap', 'stomp'], name: 'Alternating Beat', difficulty: 3 },
    { id: 6, sequence: ['clap', 'clap', 'stomp', 'stomp'], name: 'Double Double', difficulty: 3 },
  ];

  // Audio synthesis for feedback
  const playSound = (type: 'clap' | 'stomp' | 'success' | 'error') => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    switch (type) {
      case 'clap':
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        oscillator.type = 'square';
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        break;
      case 'stomp':
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        break;
      case 'success':
        oscillator.frequency.setValueAtTime(523, ctx.currentTime);
        oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        break;
      case 'error':
        oscillator.frequency.setValueAtTime(150, ctx.currentTime);
        oscillator.type = 'sawtooth';
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        break;
    }
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  };

  const playPattern = async (pattern: Pattern) => {
    setIsPlaying(true);
    for (let i = 0; i < pattern.sequence.length; i++) {
      playSound(pattern.sequence[i]);
      await new Promise(resolve => setTimeout(resolve, 600));
    }
    setIsPlaying(false);
  };

  const handleUserInput = (action: 'clap' | 'stomp') => {
    if (gamePhase !== 'practice' && gamePhase !== 'challenge') return;
    
    playSound(action);
    const newUserPattern = [...userPattern, action];
    setUserPattern(newUserPattern);
    
    if (currentPattern && newUserPattern.length === currentPattern.sequence.length) {
      checkPattern(newUserPattern);
    }
  };

  const checkPattern = (userInput: ('clap' | 'stomp')[]) => {
    if (!currentPattern) return;
    
    const isCorrect = userInput.every((action, index) => action === currentPattern.sequence[index]);
    
    if (isCorrect) {
      playSound('success');
      setScore(score + currentPattern.difficulty * 10);
      setFeedback('🎉 Perfect! You got it right!');
      setShowSuccess(true);
      
      setTimeout(() => {
        if (level < patterns.length) {
          setLevel(level + 1);
          nextPattern();
        } else {
          setGamePhase('complete');
          // Send completion event
          window.postMessage({ 
            type: 'BLOCK_COMPLETION', 
            blockId: '6853cc587405ab9cb3e4cfbb', 
            completed: true,
            score: score + currentPattern.difficulty * 10,
            maxScore: patterns.reduce((sum, p) => sum + p.difficulty * 10, 0)
          }, '*');
          window.parent.postMessage({ 
            type: 'BLOCK_COMPLETION', 
            blockId: '6853cc587405ab9cb3e4cfbb', 
            completed: true,
            score: score + currentPattern.difficulty * 10,
            maxScore: patterns.reduce((sum, p) => sum + p.difficulty * 10, 0)
          }, '*');
        }
        setShowSuccess(false);
      }, 2000);
    } else {
      playSound('error');
      setFeedback('🤔 Not quite! Try listening again and copy the pattern.');
      setTimeout(() => setFeedback(''), 2000);
    }
    
    setUserPattern([]);
  };

  const nextPattern = () => {
    const pattern = patterns[level - 1];
    setCurrentPattern(pattern);
    setGamePhase('watch');
    setUserPattern([]);
    setFeedback('');
  };

  const startGame = () => {
    setGamePhase('watch');
    setCurrentPattern(patterns[0]);
    setScore(0);
    setLevel(1);
  };

  const startPractice = () => {
    setGamePhase('practice');
    setFeedback('Now it\'s your turn! Tap the buttons to copy the pattern.');
  };

  useEffect(() => {
    if (gamePhase === 'watch' && currentPattern && !isPlaying) {
      const timer = setTimeout(() => {
        playPattern(currentPattern);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gamePhase, currentPattern]);

  const getActionIcon = (action: 'clap' | 'stomp') => {
    return action === 'clap' ? '👏' : '🦶';
  };

  const getActionColor = (action: 'clap' | 'stomp') => {
    return action === 'clap' ? '#FF6B6B' : '#4ECDC4';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: 'Arial, sans-serif',
      color: 'white',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {gamePhase === 'intro' && (
        <div style={{ textAlign: 'center', maxWidth: '600px' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '20px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            🕵️‍♀️ Rhythm Detective
          </h1>
          <p style={{ fontSize: '1.2rem', marginBottom: '30px', lineHeight: '1.6' }}>
            Welcome, Detective! Your mission is to solve rhythm mysteries by listening carefully 
            and copying the beat patterns you hear. Are you ready to become a Rhythm Detective?
          </p>
          <div style={{ marginBottom: '30px' }}>
            <h3>How to Play:</h3>
            <div style={{ textAlign: 'left', display: 'inline-block' }}>
              <p>🎵 1. Watch and listen to the pattern</p>
              <p>👏 2. Copy it back using Clap and Stomp buttons</p>
              <p>🏆 3. Solve all 6 rhythm mysteries to win!</p>
            </div>
          </div>
          <button
            onClick={startGame}
            style={{
              fontSize: '1.5rem',
              padding: '15px 30px',
              backgroundColor: '#FF6B6B',
              color: 'white',
              border: 'none',
              borderRadius: '50px',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Start Detective Training! 🔍
          </button>
        </div>
      )}

      {(gamePhase === 'watch' || gamePhase === 'practice') && currentPattern && (
        <div style={{ textAlign: 'center', maxWidth: '800px', width: '100%' }}>
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>
              Mystery #{level}: {currentPattern.name}
            </h2>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.1)',
              padding: '10px 20px',
              borderRadius: '20px',
              marginBottom: '20px'
            }}>
              <span>Level: {level}/6</span>
              <span>Score: {score}</span>
              <span>Difficulty: {'⭐'.repeat(currentPattern.difficulty)}</span>
            </div>
          </div>

          <div style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '30px',
            marginBottom: '30px'
          }}>
            <h3 style={{ marginBottom: '20px' }}>
              {gamePhase === 'watch' ? '👀 Watch and Listen Carefully!' : '🎵 Your Turn - Copy the Pattern!'}
            </h3>
            
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '15px',
              marginBottom: '30px',
              flexWrap: 'wrap'
            }}>
              {currentPattern.sequence.map((action, index) => (
                <div
                  key={index}
                  style={{
                    width: '80px',
                    height: '80px',
                    backgroundColor: getActionColor(action),
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    animation: isPlaying ? `pulse ${index * 0.6}s ease-in-out` : 'none',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                  }}
                >
                  {getActionIcon(action)}
                </div>
              ))}
            </div>

            {gamePhase === 'watch' && (
              <div>
                <button
                  onClick={() => playPattern(currentPattern)}
                  disabled={isPlaying}
                  style={{
                    fontSize: '1.2rem',
                    padding: '12px 25px',
                    backgroundColor: isPlaying ? '#666' : '#4ECDC4',
                    color: 'white',
                    border: 'none',
                    borderRadius: '25px',
                    cursor: isPlaying ? 'not-allowed' : 'pointer',
                    marginRight: '15px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                  }}
                >
                  {isPlaying ? '🎵 Playing...' : '🔄 Play Again'}
                </button>
                <button
                  onClick={startPractice}
                  style={{
                    fontSize: '1.2rem',
                    padding: '12px 25px',
                    backgroundColor: '#FF6B6B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '25px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                  }}
                >
                  Ready to Try! ✨
                </button>
              </div>
            )}
          </div>

          {gamePhase === 'practice' && (
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ marginBottom: '20px' }}>Tap the buttons to copy the pattern:</h3>
              
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '30px',
                marginBottom: '30px'
              }}>
                <button
                  onClick={() => handleUserInput('clap')}
                  style={{
                    width: '120px',
                    height: '120px',
                    fontSize: '3rem',
                    backgroundColor: '#FF6B6B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                    transition: 'transform 0.1s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  👏<br/>
                  <small style={{ fontSize: '0.4em' }}>CLAP</small>
                </button>
                
                <button
                  onClick={() => handleUserInput('stomp')}
                  style={{
                    width: '120px',
                    height: '120px',
                    fontSize: '3rem',
                    backgroundColor: '#4ECDC4',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                    transition: 'transform 0.1s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  🦶<br/>
                  <small style={{ fontSize: '0.4em' }}>STOMP</small>
                </button>
              </div>

              {userPattern.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4>Your pattern so far:</h4>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                    {userPattern.map((action, index) => (
                      <span key={index} style={{ 
                        fontSize: '1.5rem',
                        padding: '5px 10px',
                        backgroundColor: getActionColor(action),
                        borderRadius: '15px'
                      }}>
                        {getActionIcon(action)}
                      </span>
                    ))}
                    {userPattern.length < currentPattern.sequence.length && (
                      <span style={{ 
                        fontSize: '1.5rem',
                        padding: '5px 10px',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        borderRadius: '15px'
                      }}>
                        ?
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {feedback && (
            <div style={{
              fontSize: '1.3rem',
              padding: '15px 25px',
              backgroundColor: showSuccess ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)',
              borderRadius: '20px',
              marginBottom: '20px',
              border: showSuccess ? '2px solid #4CAF50' : '2px solid #F44336'
            }}>
              {feedback}
            </div>
          )}
        </div>
      )}

      {gamePhase === 'complete' && (
        <div style={{ textAlign: 'center', maxWidth: '600px' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>
            🎉 Congratulations, Detective!
          </h1>
          <p style={{ fontSize: '1.5rem', marginBottom: '20px' }}>
            You've solved all the rhythm mysteries!
          </p>
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '30px',
            marginBottom: '30px'
          }}>
            <h2>Final Score: {score} points</h2>
            <p>You've completed Level {level-1} of 6 challenges!</p>
            <p>🏆 You're officially a certified Rhythm Detective! 🏆</p>
          </div>
          <button
            onClick={() => {
              setGamePhase('intro');
              setLevel(1);
              setScore(0);
              setCurrentPattern(null);
              setUserPattern([]);
              setFeedback('');
            }}
            style={{
              fontSize: '1.3rem',
              padding: '15px 30px',
              backgroundColor: '#FF6B6B',
              color: 'white',
              border: 'none',
              borderRadius: '50px',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}
          >
            Play Again! 🔄
          </button>
        </div>
      )}

      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.2); box-shadow: 0 0 20px rgba(255,255,255,0.5); }
            100% { transform: scale(1); }
          }
        `}
      </style>
    </div>
  );
};

export default Block;