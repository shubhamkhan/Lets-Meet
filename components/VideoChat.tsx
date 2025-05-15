import React, { useState, useEffect, useRef } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaDesktop, FaPhoneSlash, FaCommentAlt, FaTimes } from 'react-icons/fa';

interface VideoChatProps {
  roomId: string;
  username?: string;
  isCreator?: boolean;
  tempRoomId?: string;
  onJoinApproved?: () => void;
  onJoinRejected?: () => void;
}

interface Participant {
  id: string;
  stream: MediaStream | null;
  username: string;
  peerConnection: RTCPeerConnection | null;
}

interface ChatMessage {
  sender: string;
  text: string;
  timestamp: number;
}

const VideoChat: React.FC<VideoChatProps> = ({ 
  roomId, 
  username = 'You', 
  isCreator = false, 
  tempRoomId = '',
  onJoinApproved,
  onJoinRejected
}) => {
  // Video refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const participantRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  
  // WebRTC and WebSocket refs
  const peerConnectionsRef = useRef<{ [key: string]: RTCPeerConnection }>({});
  const wsRef = useRef<WebSocket | null>(null);
  
  // State for controls
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Participants state
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [userId, setUserId] = useState<string>('');
  
  // Client info for WebSocket
  const clientInfoRef = useRef<{
    roomId: string | null;
    userId: string | null;
    username: string | null;
  }>({
    roomId: null,
    userId: null,
    username: null
  });
  
  // Chat state
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Setup media streams with fallbacks
  const setupMedia = async () => {
    let stream: MediaStream | null = null;
    
    // Try to get both audio and video
    try {
      console.log('Requesting audio and video permissions...');
      stream = await navigator.mediaDevices?.getUserMedia({
        video: true,
        audio: true,
      });
      console.log('Successfully got audio and video permissions');
    } catch (error) {
      console.warn('Failed to get both audio and video:', error);
      
      // Try to get only video if audio+video fails
      try {
        console.log('Trying to get only video permission...');
        stream = await navigator.mediaDevices?.getUserMedia({
          video: true,
          audio: false,
        });
        console.log('Successfully got video permission (no audio)');
      } catch (videoError) {
        console.warn('Failed to get video:', videoError);
        
        // Try to get only audio if video fails
        try {
          console.log('Trying to get only audio permission...');
          stream = await navigator.mediaDevices?.getUserMedia({
            video: false,
            audio: true,
          });
          console.log('Successfully got audio permission (no video)');
        } catch (audioError) {
          console.warn('Failed to get audio:', audioError);
          
          // Create an empty stream as a last resort
          console.log('Creating empty media stream as fallback');
          stream = new MediaStream();
        }
      }
    }
    
    // Safety check to ensure we have a stream
    if (!stream) {
      console.error('Failed to create any media stream');
      stream = new MediaStream();
    }
    
    // Enable audio tracks if they exist
    const audioTracks = stream.getAudioTracks();
    if (audioTracks && audioTracks.length > 0) {
      audioTracks[0].enabled = true;
      console.log('Audio track enabled:', audioTracks[0].label);
    } else {
      console.warn('No audio tracks found in the media stream');
    }
    
    // Set the local stream state
    setLocalStream(stream);
    
    // Set the video element source
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    // Notify server that we're ready to connect
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'ready',
        roomId,
        userId,
        username
      }));
    } else {
      // If WebSocket is not open yet, wait for it to open
      const checkAndSendReady = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'ready',
            roomId,
            userId,
            username
          }));
        } else {
          setTimeout(checkAndSendReady, 100);
        }
      };
      
      setTimeout(checkAndSendReady, 100);
    }

    return stream;
  };

  // Initialize media and start call
  const initializeCall = async () => {
    setIsConnecting(true);
    try {
      await setupMedia();
      setIsConnecting(false);
      setIsConnected(true);
    } catch (error) {
      console.error('Error initializing call:', error);
      setIsConnecting(false);
    }
  };

  // Initialize userId once on client side to avoid hydration errors
  useEffect(() => {
    setUserId(`user_${Math.floor(Math.random() * 1000000)}`);
    
    // Auto-start call for the creator of the meeting
    if (isCreator) {
      initializeCall();
    }
  }, [isCreator]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Initialize WebSocket connection and event handlers
  useEffect(() => {
    if (!userId) return; // Wait until userId is set
    
    // Use the current hostname instead of hardcoding 'localhost'
    // This allows the app to work on any device on the local network
    const wsUrl = `ws://${process.env.NEXT_PUBLIC_SIGNALING_SERVER}:5000`;
    console.log('Connecting to WebSocket server at:', wsUrl);
    wsRef.current = new WebSocket(wsUrl);
    
    // Update client info
    clientInfoRef.current.roomId = roomId;
    clientInfoRef.current.userId = userId;
    clientInfoRef.current.username = username;
    
    wsRef.current.onopen = () => {
      console.log('WebSocket connection established');
      
      if (isCreator) {
        // If creating a new room, send create-room message
        wsRef.current?.send(JSON.stringify({ 
          type: 'create-room', 
          roomId,
          userId,
          username
        }));
      } else if (tempRoomId) {
        // If joining an existing room, send request-join message
        wsRef.current?.send(JSON.stringify({ 
          type: 'request-join', 
          roomId: tempRoomId,
          userId,
          username
        }));
      } else {
        // Fallback to direct join (for backward compatibility)
        wsRef.current?.send(JSON.stringify({ 
          type: 'join', 
          roomId,
          userId,
          username
        }));
      }
    };

    wsRef.current.onmessage = async (message) => {
      try {
        const data = JSON.parse(message.data);
        
        // Handle different message types
        if (data.type === 'id-updated') {
          console.log(`User ID updated from ${data.oldId} to ${data.newId}`);
          
          // Update the userId state
          setUserId(data.newId);
          
          // Update client info reference
          clientInfoRef.current.userId = data.newId;
          
          // Close any existing peer connections since they were created with the old ID
          Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
          peerConnectionsRef.current = {};
          
          // Clear participants list to rebuild it
          setParticipants([]);
          
          // Send acknowledgment to the server that we've updated our ID
          wsRef.current?.send(JSON.stringify({
            type: 'id-update-ack',
            oldId: data.oldId,
            newId: data.newId,
            roomId: data.roomId
          }));
          
          console.log('Sent ID update acknowledgment');
        } else if (data.type === 'join-approved') {
          console.log('Join approved');
          
          // Call the callback to notify parent component
          if (onJoinApproved) {
            onJoinApproved();
            
            // Auto-initialize call when approved
            initializeCall();
          }
        } else if (data.type === 'join-rejected') {
          console.log('Join rejected');
          
          // Call the callback to notify parent component
          if (onJoinRejected) {
            onJoinRejected();
          }
        } else if (data.type === 'join') {
          console.log('User joined the room:', data.userId);
          
          // If a new user joined, send them an offer
          if (data.userId !== userId && localStream) {
            console.log('Creating offer for new user:', data.userId);
            createPeerConnection(data.userId, data.username);
          }
        } else if (data.type === 'user-list') {
          console.log('Received user list:', data.users);
          // Initialize connections with existing users
          if (localStream) {
            data.users.forEach((user: { id: string, username: string }) => {
              if (user.id !== userId && !peerConnectionsRef.current[user.id]) {
                createPeerConnection(user.id, user.username);
              }
            });
          }
        } else if (data.offer) {
          console.log('Received offer from:', data.userId);
          await handleOffer(data.offer, data.userId, data.username);
        } else if (data.answer) {
          console.log('Received answer from:', data.userId);
          await handleAnswer(data.answer, data.userId);
        } else if (data.candidate) {
          console.log('Received ICE candidate from:', data.userId);
          await handleCandidate(data.candidate, data.userId);
        } else if (data.type === 'leave') {
          console.log('User left the room:', data.userId);
          handleUserLeft(data.userId);
        } else if (data.type === 'chat') {
          console.log('Received chat message from:', data.username);
          setMessages(prev => [...prev, {
            sender: data.username,
            text: data.text,
            timestamp: data.timestamp
          }]);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket connection closed');
    };

    // Clean up on component unmount
    return () => {
      // Notify server that user is leaving
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'leave',
          roomId,
          userId
        }));
      }
      
      // Close WebSocket
      wsRef.current?.close();
      
      // Close all peer connections
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      
      // Stop all tracks
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [roomId, userId, username, isCreator, tempRoomId, onJoinApproved, onJoinRejected, localStream]);

  // Create peer connection for a specific user
  const createPeerConnection = async (peerId: string, peerUsername: string) => {
    try {
      console.log('Creating peer connection for:', peerId);
      
      // Create new RTCPeerConnection
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      
      // Store the connection
      peerConnectionsRef.current[peerId] = peerConnection;
      
      // Add local tracks to the connection
      if (localStream) {
        localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStream);
        });
      }
      
      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              candidate: event.candidate,
              roomId,
              userId,
              targetUserId: peerId
            }));
          } else {
            console.error('WebSocket not open when trying to send ICE candidate');
          }
        }
      };
      
      // Handle incoming tracks
      peerConnection.ontrack = (event) => {
        console.log('Received tracks from:', peerId);
        
        // Add new participant if not already in the list
        setParticipants(prev => {
          const exists = prev.some(p => p.id === peerId);
          
          if (!exists) {
            return [...prev, {
              id: peerId,
              stream: event.streams[0],
              username: peerUsername,
              peerConnection
            }];
          }
          
          // Update existing participant's stream
          return prev.map(p => 
            p.id === peerId 
              ? { ...p, stream: event.streams[0] } 
              : p
          );
        });
      };
      
      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          offer,
          roomId,
          userId,
          username,
          targetUserId: peerId
        }));
      } else {
        console.error('WebSocket not open when trying to send offer');
      }
      
      return peerConnection;
    } catch (error) {
      console.error('Error creating peer connection:', error);
      throw error;
    }
  };

  // Handle incoming offer
  const handleOffer = async (offer: RTCSessionDescriptionInit, peerId: string, peerUsername: string) => {
    try {
      console.log('Handling offer from:', peerId);
      
      // Ensure we have local media
      if (!localStream) {
        await setupMedia();
      }
      
      // Create peer connection if it doesn't exist
      let peerConnection = peerConnectionsRef.current[peerId];
      
      if (!peerConnection) {
        peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        
        peerConnectionsRef.current[peerId] = peerConnection;
        
        // Add local tracks
        if (localStream) {
          localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
          });
        }
        
        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                candidate: event.candidate,
                roomId,
                userId,
                targetUserId: peerId
              }));
            } else {
              console.error('WebSocket not open when trying to send ICE candidate');
            }
          }
        };
        
        // Handle incoming tracks
        peerConnection.ontrack = (event) => {
          console.log('Received tracks from:', peerId);
          
          setParticipants(prev => {
            const exists = prev.some(p => p.id === peerId);
            
            if (!exists) {
              return [...prev, {
                id: peerId,
                stream: event.streams[0],
                username: peerUsername,
                peerConnection
              }];
            }
            
            return prev.map(p => 
              p.id === peerId 
                ? { ...p, stream: event.streams[0] } 
                : p
            );
          });
        };
      }
      
      // Check if the peer connection is not closed before setting the remote description
      if (peerConnection.signalingState !== 'closed') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      } else {
        console.error('Cannot set remote description, peer connection is closed');
        return; // Exit the function if the connection is closed
      }
      
      // Create and send answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          answer,
          roomId,
          userId,
          targetUserId: peerId
        }));
      } else {
        console.error('WebSocket not open when trying to send answer');
      }
      
      setIsConnected(true);
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  // Handle incoming answer
  const handleAnswer = async (answer: RTCSessionDescriptionInit, peerId: string) => {
    try {
      const peerConnection = peerConnectionsRef.current[peerId];
      
      if (peerConnection && peerConnection.signalingState !== 'closed') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      } else if (peerConnection) {
        console.error('Cannot set remote description, peer connection is closed');
      } else {
        console.error('Peer connection not found for:', peerId);
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  // Handle incoming ICE candidate
  const handleCandidate = async (candidate: RTCIceCandidateInit, peerId: string) => {
    try {
      const peerConnection = peerConnectionsRef.current[peerId];
      
      if (peerConnection && peerConnection.signalingState !== 'closed' && peerConnection.connectionState !== 'closed') {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } else if (peerConnection) {
        console.error('Cannot add ICE candidate, peer connection is closed');
      } else {
        console.error('Peer connection not found for:', peerId);
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  };

  // Handle user leaving
  const handleUserLeft = (peerId: string) => {
    // Close and remove peer connection
    if (peerConnectionsRef.current[peerId]) {
      peerConnectionsRef.current[peerId].close();
      delete peerConnectionsRef.current[peerId];
    }
    
    // Remove participant from state
    setParticipants(prev => prev.filter(p => p.id !== peerId));
  };

  // Toggle audio mute with safety checks
  const handleMuteToggle = () => {
    if (localStream) {
      try {
        const audioTracks = localStream.getAudioTracks();
        if (audioTracks && audioTracks.length > 0) {
          // If currently muted, unmute (set enabled to true)
          // If currently unmuted, mute (set enabled to false)
          audioTracks[0].enabled = isMuted; // isMuted is the current state before toggle
          console.log(`Audio ${isMuted ? 'unmuted' : 'muted'}`);
        } else {
          console.warn('No audio tracks available to mute/unmute');
        }
      } catch (error) {
        console.error('Error toggling mute state:', error);
      }
      
      // Always toggle the UI state even if there are no audio tracks
      // This ensures the UI remains responsive
      setIsMuted(!isMuted);
    }
  };

  // Toggle video with safety checks
  const handleVideoToggle = () => {
    if (localStream) {
      try {
        const videoTracks = localStream.getVideoTracks();
        if (videoTracks && videoTracks.length > 0) {
          videoTracks[0].enabled = !isVideoOn;
          console.log(`Video ${!isVideoOn ? 'enabled' : 'disabled'}`);
        } else {
          console.warn('No video tracks available to toggle');
        }
      } catch (error) {
        console.error('Error toggling video state:', error);
      }
      
      // Always toggle the UI state even if there are no video tracks
      // This ensures the UI remains responsive
      setIsVideoOn(!isVideoOn);
    }
  };

  // Toggle screen sharing with better error handling
  const handleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        console.log('Switching back to camera from screen sharing');
        // Switch back to camera
        try {
          // Try to get both video and audio
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
          });
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          
          // Replace track in all peer connections if video track exists
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            Object.values(peerConnectionsRef.current).forEach(pc => {
              try {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (sender) {
                  sender.replaceTrack(videoTrack);
                }
              } catch (senderError) {
                console.error('Error replacing track in peer connection:', senderError);
              }
            });
          }
          
          setLocalStream(stream);
        } catch (cameraError) {
          console.warn('Failed to get camera after screen sharing:', cameraError);
          // If we can't get the camera, at least stop screen sharing
          if (localStream) {
            const screenTracks = localStream.getVideoTracks();
            screenTracks.forEach(track => track.stop());
          }
        }
        
        setIsScreenSharing(false);
      } else {
        console.log('Switching to screen sharing');
        // Switch to screen sharing
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({ 
            video: true 
          });
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          
          // Keep audio from the current stream if it exists
          if (localStream) {
            const audioTracks = localStream.getAudioTracks();
            if (audioTracks.length > 0) {
              audioTracks.forEach(track => {
                stream.addTrack(track);
              });
            }
          }
          
          // Replace track in all peer connections if video track exists
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            Object.values(peerConnectionsRef.current).forEach(pc => {
              try {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (sender) {
                  sender.replaceTrack(videoTrack);
                }
              } catch (senderError) {
                console.error('Error replacing track in peer connection:', senderError);
              }
            });
            
            // Handle when user stops screen sharing
            videoTrack.onended = async () => {
              console.log('Screen sharing ended by user');
              try {
                const newStream = await navigator.mediaDevices.getUserMedia({ 
                  video: true, 
                  audio: true 
                });
                
                if (localVideoRef.current) {
                  localVideoRef.current.srcObject = newStream;
                }
                
                // Replace track in all peer connections
                const newVideoTrack = newStream.getVideoTracks()[0];
                if (newVideoTrack) {
                  Object.values(peerConnectionsRef.current).forEach(pc => {
                    try {
                      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                      if (sender) {
                        sender.replaceTrack(newVideoTrack);
                      }
                    } catch (senderError) {
                      console.error('Error replacing track after screen sharing ended:', senderError);
                    }
                  });
                }
                
                setLocalStream(newStream);
              } catch (cameraError) {
                console.warn('Failed to get camera after screen sharing ended:', cameraError);
              }
              
              setIsScreenSharing(false);
            };
          }
          
          setLocalStream(stream);
          setIsScreenSharing(true);
        } catch (screenError) {
          // User probably canceled the screen sharing dialog
          console.warn('Failed to get screen sharing:', screenError);
        }
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      // Ensure UI state is consistent even if there's an error
      setIsScreenSharing(false);
    }
  };

  // End call and clean up
  const handleEndCall = () => {
    // Notify server that user is leaving
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'leave',
        roomId,
        userId
      }));
    }
    
    // Close all peer connections
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};
    
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    setParticipants([]);
    setIsConnected(false);
  };

  // Send chat message
  const sendMessage = () => {
    if (message.trim() !== '') {
      const timestamp = Date.now();
      
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ 
          type: 'chat',
          text: message,
          roomId,
          userId,
          username,
          timestamp
        }));
        
        setMessages(prev => [...prev, {
          sender: 'You',
          text: message,
          timestamp
        }]);
        
        setMessage('');
      } else {
        console.error('WebSocket not open when trying to send chat message');
      }
    }
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Toggle chat panel
  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  // Render participant video
  const renderParticipantVideo = (participant: Participant) => {
    return (
      <div key={participant.id} className="relative overflow-hidden rounded-lg bg-gray-800 aspect-video">
        <video
          ref={el => {
            participantRefs.current[participant.id] = el;
            if (el && participant.stream) {
              el.srcObject = participant.stream;
            }
          }}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />
        <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-sm">
          {participant.username}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-google-bg-dark">
      <div className={`flex-1 flex flex-col ${isChatOpen ? 'mr-[350px]' : ''}`}>
        {/* Video grid */}
        <div className="flex-1 p-4 overflow-auto">
          <div className={`grid gap-4 h-full ${
            participants.length === 0 ? 'grid-cols-1' :
            participants.length < 3 ? 'grid-cols-2' :
            participants.length < 5 ? 'grid-cols-2' :
            participants.length < 7 ? 'grid-cols-3' : 'grid-cols-4'
          }`}>
            {/* Local video */}
            <div className="relative overflow-hidden rounded-lg bg-gray-800 aspect-video border-2 border-google-blue">
              <video 
                ref={localVideoRef} 
                autoPlay 
                muted 
                playsInline 
                className={`w-full h-full object-contain ${!isVideoOn ? 'hidden' : ''}`}
              />
              {!isVideoOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-2xl text-white">
                    {username.charAt(0).toUpperCase()}
                  </div>
                </div>
              )}
              <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-sm">
                You
              </div>
            </div>
            
            {/* Participant videos */}
            {participants.map(renderParticipantVideo)}
          </div>
        </div>
        
        {/* Controls */}
        <div className="h-16 bg-google-bg-dark border-t border-gray-700 flex items-center justify-center px-4">
          {!isConnected ? (
            <button 
              onClick={initializeCall} 
              disabled={isConnecting}
              className="bg-google-green hover:bg-green-700 text-white px-6 py-2 rounded-full transition-colors"
            >
              {isConnecting ? 'Connecting...' : 'Start Call'}
            </button>
          ) : (
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleMuteToggle} 
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isMuted ? 'bg-google-red text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
              </button>
              
              <button 
                onClick={handleVideoToggle} 
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  !isVideoOn ? 'bg-google-red text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
                title={isVideoOn ? 'Turn Off Video' : 'Turn On Video'}
              >
                {isVideoOn ? <FaVideo /> : <FaVideoSlash />}
              </button>
              
              <button 
                onClick={handleScreenShare} 
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isScreenSharing ? 'bg-google-blue text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
                title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
              >
                <FaDesktop />
              </button>
              
              <button 
                onClick={toggleChat} 
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isChatOpen ? 'bg-google-blue text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
                title="Chat"
              >
                <FaCommentAlt />
              </button>
              
              <button 
                onClick={handleEndCall} 
                className="w-10 h-10 rounded-full flex items-center justify-center bg-google-red text-white hover:bg-google-red-hover"
                title="End Call"
              >
                <FaPhoneSlash />
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Chat panel */}
      {isChatOpen && (
        <div className="fixed right-0 top-[64px] bottom-0 w-[350px] bg-white border-l border-gray-200 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-800">In-call messages</h3>
            <button onClick={toggleChat} className="text-gray-500 hover:text-gray-700">
              <FaTimes />
            </button>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <p>No messages yet</p>
                <p className="text-sm mt-2">Messages are only shared during the call and will not be saved after</p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div key={index} className={`mb-4 ${msg.sender === 'You' ? 'text-right' : ''}`}>
                  <div className={`inline-block max-w-[85%] rounded-lg px-4 py-2 ${
                    msg.sender === 'You' 
                      ? 'bg-google-blue text-white' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {msg.sender !== 'You' && (
                      <div className="font-medium text-sm mb-1">{msg.sender}</div>
                    )}
                    <div>{msg.text}</div>
                    <div className="text-xs mt-1 opacity-70">{formatTime(msg.timestamp)}</div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-4 border-t border-gray-200">
            <div className="flex">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Send a message to everyone"
                className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-google-blue focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button 
                onClick={sendMessage}
                disabled={!message.trim()}
                className={`px-4 py-2 rounded-r-md ${
                  message.trim() 
                    ? 'bg-google-blue text-white hover:bg-google-blue-hover' 
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoChat;
