import React, { useState, useEffect } from 'react';
import VideoChat from '../components/VideoChat';
import VideoChatUI from '../components/VideoChatUI';
import Head from 'next/head';
import { FaTimes } from 'react-icons/fa';

const Home = () => {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [inputRoomId, setInputRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [tempRoomId, setTempRoomId] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  // Generate a default username if none is provided
  useEffect(() => {
    if (!username) {
      setUsername(`User${Math.floor(Math.random() * 1000)}`);
    }
  }, [username]);

  const handleCreateRoom = () => {
    setIsCreatingRoom(true);
    setShowUsernameModal(true);
    const generatedRoomId = Math.random().toString(36).substring(2, 15);
    setTempRoomId(generatedRoomId);
  };

  const handleJoinRoom = () => {
    if (!inputRoomId.trim()) {
      alert('Please enter a room ID');
      return;
    }
    
    setTempRoomId(inputRoomId);
    setIsCreatingRoom(false);
    setShowUsernameModal(true);
  };

  const handleUsernameSubmit = () => {
    if (!username.trim()) {
      alert('Please enter a username');
      return;
    }
    
    if (isCreatingRoom) {
      // Creating a new room
      setRoomId(tempRoomId);
      console.log('Room created with ID:', tempRoomId);
    } else {
      // Joining an existing room - now directly join without waiting for approval
      setRoomId(tempRoomId);
      console.log('Joining room with ID:', tempRoomId);
    }
    
    setShowUsernameModal(false);
  };

  const handleLeaveRoom = () => {
    setRoomId(null);
    setInputRoomId('');
  };

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>{roomId ? `Meeting: ${roomId}` : 'Lets Meet'}</title>
        <meta name="description" content="Lets Meet with WebRTC" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      {/* Username Modal */}
      {showUsernameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-medium text-gray-900">
                {isCreatingRoom ? 'Create Meeting' : 'Join Meeting'}
              </h3>
              <button 
                onClick={() => setShowUsernameModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="mb-4">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-google-blue focus:border-transparent"
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && handleUsernameSubmit()}
              />
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleUsernameSubmit}
                className="bg-google-blue hover:bg-google-blue-hover text-white px-4 py-2 rounded-md"
              >
                {isCreatingRoom ? 'Start Meeting' : 'Join Meeting'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!roomId ? (
        <VideoChatUI 
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          inputRoomId={inputRoomId}
          setInputRoomId={setInputRoomId}
          isJoining={isJoining}
        />
      ) : (
        <div className="video-chat-container">
          <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center">
            <div className="flex items-center">
              <div className="mr-2">
                <svg width="40" height="40" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0" y="0" width="192" height="192" rx="24" fill="white" />
                  <path d="M144 88h-40V40h40c4.4 0 8 3.6 8 8v32c0 4.4-3.6 8-8 8Z" fill="#00832d" />
                  <path d="M40 40h40v48H40c-4.4 0-8-3.6-8-8V48c0-4.4 3.6-8 8-8Z" fill="#0066da" />
                  <path d="M40 104h40v48H40c-4.4 0-8-3.6-8-8v-32c0-4.4 3.6-8 8-8Z" fill="#e94235" />
                  <path d="M144 104h-40v48h40c4.4 0 8-3.6 8-8v-32c0-4.4-3.6-8-8-8Z" fill="#ffba00" />
                </svg>
              </div>
              <span className="text-xl text-gray-600 font-medium">Lets Meet</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full mr-4">
                Meeting code: <span className="font-medium">{roomId}</span>
              </span>
              <button 
                onClick={handleLeaveRoom}
                className="bg-google-red hover:bg-google-red-hover text-white px-4 py-2 rounded-md"
              >
                Leave meeting
              </button>
            </div>
          </div>
          <VideoChat 
            roomId={roomId} 
            username={username} 
            isCreator={isCreatingRoom}
            tempRoomId={tempRoomId}
            onJoinApproved={() => {
              // No longer needed but kept for compatibility
              setRoomId(tempRoomId);
            }}
            onJoinRejected={() => {
              // No longer needed but kept for compatibility
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Home;
