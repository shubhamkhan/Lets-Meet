const WebSocket = require('ws');
const http = require('http');
const server = http.createServer();

// Create WebSocket server with options to make it accessible from any device on local network
const wss = new WebSocket.Server({ 
  server,
  // This allows connections from any origin
  verifyClient: (info) => {
    return true; // Accept all connections
  }
});

// Listen on all network interfaces (0.0.0.0) instead of just localhost
server.listen(5000, '0.0.0.0', () => {
  console.log('Signaling server running on ws://0.0.0.0:5000');
  console.log('Access from other devices using your local IP address');
});

// Store clients by room ID
const rooms = new Map();
// Store client info
const clients = new Map();
// Store pending join requests
const pendingJoinRequests = new Map();
// Store room owners (first person who created the room)
const roomOwners = new Map();
// Store connections that are waiting for ID update acknowledgment
const pendingIdUpdates = new Map();

wss.on('connection', (ws) => {
  let clientInfo = {
    roomId: null,
    userId: null,
    username: null
  };

  ws.on('message', (messageData) => {
    try {
      const message = JSON.parse(messageData);
      
      // Handle new meeting creation
      if (message.type === 'create-room') {
        const { roomId, userId, username } = message;
        
        // Store client info
        clientInfo.roomId = roomId;
        clientInfo.userId = userId;
        clientInfo.username = username || 'Anonymous';
        
        // Store client in clients map
        clients.set(ws, clientInfo);
        
        // Create new room
        rooms.set(roomId, new Map());
        
        // Set this user as the room owner
        roomOwners.set(roomId, userId);
        
        // Add client to room with their ID
        rooms.get(roomId).set(userId, {
          ws,
          username: clientInfo.username,
          isOwner: true
        });
        
        console.log(`User ${userId} (${clientInfo.username}) created room: ${roomId}`);
        
        // Confirm room creation to the creator
        ws.send(JSON.stringify({
          type: 'room-created',
          roomId,
          userId
        }));
      }
      // Handle request to join a room - now directly joins without permission
      else if (message.type === 'request-join') {
        const { roomId, userId, username } = message;
        
        // Check if room exists
        if (!rooms.has(roomId)) {
          // Room doesn't exist
          ws.send(JSON.stringify({
            type: 'room-not-found',
            roomId
          }));
          return;
        }
        
        // Check if this WebSocket connection is already in a room
        if (clients.has(ws)) {
          const existingInfo = clients.get(ws);
          if (existingInfo.roomId === roomId) {
            console.log(`User ${existingInfo.userId} already in room ${roomId}, ignoring duplicate join request`);
            return;
          }
        }
        
        // Store client info
        clientInfo.roomId = roomId;
        clientInfo.userId = userId;
        clientInfo.username = username || 'Anonymous';
        
        // Store client in clients map
        clients.set(ws, clientInfo);
        
        // Check if user with this ID already exists in the room
        if (rooms.get(roomId).has(userId)) {
          console.log(`User with ID ${userId} already exists in room ${roomId}. Generating new ID.`);
          // Generate a new unique ID by appending a timestamp
          const originalId = userId;
          const newUserId = `${originalId}_${Date.now()}`;
          clientInfo.userId = newUserId;
          
          // Add to pending ID updates
          pendingIdUpdates.set(ws, {
            roomId,
            originalId,
            newUserId,
            username
          });
          
          // Update the client's info with the new ID
          ws.send(JSON.stringify({
            type: 'id-updated',
            oldId: originalId,
            newId: newUserId,
            roomId
          }));
          
          // Wait for client to acknowledge ID update before proceeding
          console.log(`Waiting for ID update acknowledgment from ${originalId} to ${newUserId}`);
          return;
        }
        
        // Allow direct join for anyone
        completeJoin(roomId, userId, username, ws);
        
        // Send join confirmation
        ws.send(JSON.stringify({
          type: 'join-approved',
          roomId,
          userId: clientInfo.userId // Use the potentially updated userId
        }));
        
        console.log(`User ${clientInfo.userId} (${clientInfo.username}) joined room: ${roomId}`);
        console.log(`Room ${roomId} now has ${rooms.get(roomId).size} participants`);
      }
      // Handle ID update acknowledgment
      else if (message.type === 'id-update-ack') {
        if (pendingIdUpdates.has(ws)) {
          const { roomId, newUserId, username } = pendingIdUpdates.get(ws);
          console.log(`Received ID update acknowledgment, completing join for ${newUserId}`);
          
          // Complete the join process with the new ID
          completeJoin(roomId, newUserId, username, ws);
          
          // Send join confirmation
          ws.send(JSON.stringify({
            type: 'join-approved',
            roomId,
            userId: newUserId
          }));
          
          console.log(`User ${newUserId} (${username}) joined room: ${roomId}`);
          console.log(`Room ${roomId} now has ${rooms.get(roomId).size} participants`);
          
          // Remove from pending updates
          pendingIdUpdates.delete(ws);
        }
      }
      // Handle approval of join request
      else if (message.type === 'approve-join') {
        const { roomId, targetUserId } = message;
        
        if (!pendingJoinRequests.has(roomId) || !pendingJoinRequests.get(roomId).has(targetUserId)) {
          console.log(`No pending request found for user ${targetUserId} in room ${roomId}`);
          return;
        }
        
        const requestingUser = pendingJoinRequests.get(roomId).get(targetUserId);
        
        // Remove from pending requests
        pendingJoinRequests.get(roomId).delete(targetUserId);
        
        // Add to room
        rooms.get(roomId).set(targetUserId, {
          ws: requestingUser.ws,
          username: requestingUser.username
        });
        
        console.log(`Join request approved for user ${targetUserId} in room ${roomId}`);
        
        // Update client info for the requesting user
        if (clients.has(requestingUser.ws)) {
          const clientInfo = clients.get(requestingUser.ws);
          clientInfo.roomId = roomId;
        }
        
        // Notify the user that their request was approved
        if (requestingUser.ws.readyState === WebSocket.OPEN) {
          requestingUser.ws.send(JSON.stringify({
            type: 'join-approved',
            roomId
          }));
          
          // Send user list to the new participant
          const roomUsers = Array.from(rooms.get(roomId).entries()).map(([id, user]) => ({
            id,
            username: user.username
          }));
          
          requestingUser.ws.send(JSON.stringify({
            type: 'user-list',
            users: roomUsers,
            roomId
          }));
          
          // Notify other participants about the new user
          rooms.get(roomId).forEach((participant, participantId) => {
            if (participantId !== targetUserId && participant.ws.readyState === WebSocket.OPEN) {
              participant.ws.send(JSON.stringify({
                type: 'join',
                userId: targetUserId,
                username: requestingUser.username,
                roomId
              }));
            }
          });
        }
      }
      // Handle rejection of join request
      else if (message.type === 'reject-join') {
        const { roomId, targetUserId } = message;
        
        if (!pendingJoinRequests.has(roomId) || !pendingJoinRequests.get(roomId).has(targetUserId)) {
          console.log(`No pending request found for user ${targetUserId} in room ${roomId}`);
          return;
        }
        
        const requestingUser = pendingJoinRequests.get(roomId).get(targetUserId);
        
        // Remove from pending requests
        pendingJoinRequests.get(roomId).delete(targetUserId);
        
        console.log(`Join request rejected for user ${targetUserId} in room ${roomId}`);
        
        // Notify the user that their request was rejected
        if (requestingUser.ws.readyState === WebSocket.OPEN) {
          requestingUser.ws.send(JSON.stringify({
            type: 'join-rejected',
            roomId
          }));
        }
      }
      // Handle direct join (for backward compatibility and when a user is approved)
      else if (message.type === 'join') {
        const { roomId, userId, username } = message;
        
        // Check if user with this ID already exists in the room
        if (rooms.has(roomId) && rooms.get(roomId).has(userId)) {
          console.log(`User with ID ${userId} already exists in room ${roomId}. Generating new ID.`);
          // Generate a new unique ID by appending a timestamp
          const originalId = userId;
          const newUserId = `${originalId}_${Date.now()}`;
          clientInfo.userId = newUserId;
          
          // Add to pending ID updates
          pendingIdUpdates.set(ws, {
            roomId,
            originalId,
            newUserId,
            username
          });
          
          // Update the client's info with the new ID
          ws.send(JSON.stringify({
            type: 'id-updated',
            oldId: originalId,
            newId: newUserId,
            roomId
          }));
          
          // Wait for client to acknowledge ID update before proceeding
          console.log(`Waiting for ID update acknowledgment from ${originalId} to ${newUserId}`);
          return;
        }
        
        completeJoin(roomId, userId, username, ws);
      }
      // Handle user leaving
      else if (message.type === 'leave') {
        const { roomId, userId } = message;
        
        handleUserLeaving(ws, roomId, userId);
      }
      // Handle WebRTC signaling messages (offer, answer, candidate)
      else if (message.offer) {
        const { roomId, userId, targetUserId, username } = message;
        
        // Forward offer to the target user
        if (roomId && targetUserId && rooms.has(roomId) && rooms.get(roomId).has(targetUserId)) {
          const targetUser = rooms.get(roomId).get(targetUserId);
          
          if (targetUser.ws.readyState === WebSocket.OPEN) {
            targetUser.ws.send(JSON.stringify({
              offer: message.offer,
              roomId,
              userId,
              username
            }));
          }
        }
      }
      else if (message.answer) {
        const { roomId, userId, targetUserId } = message;
        
        // Forward answer to the target user
        if (roomId && targetUserId && rooms.has(roomId) && rooms.get(roomId).has(targetUserId)) {
          const targetUser = rooms.get(roomId).get(targetUserId);
          
          if (targetUser.ws.readyState === WebSocket.OPEN) {
            targetUser.ws.send(JSON.stringify({
              answer: message.answer,
              roomId,
              userId
            }));
          }
        }
      }
      else if (message.candidate) {
        const { roomId, userId, targetUserId } = message;
        
        // Forward ICE candidate to the target user
        if (roomId && targetUserId && rooms.has(roomId) && rooms.get(roomId).has(targetUserId)) {
          const targetUser = rooms.get(roomId).get(targetUserId);
          
          if (targetUser.ws.readyState === WebSocket.OPEN) {
            targetUser.ws.send(JSON.stringify({
              candidate: message.candidate,
              roomId,
              userId
            }));
          }
        }
      }
      // Handle chat messages
      else if (message.type === 'chat') {
        const { roomId, userId, username, text, timestamp } = message;
        
        // Broadcast chat message to all users in the room
        if (roomId && rooms.has(roomId)) {
          rooms.get(roomId).forEach((participant, participantId) => {
            if (participantId !== userId && participant.ws.readyState === WebSocket.OPEN) {
              participant.ws.send(JSON.stringify({
                type: 'chat',
                username,
                text,
                timestamp,
                roomId,
                userId
              }));
            }
          });
        }
      }
      // Handle ready state (user has media and is ready to connect)
      else if (message.type === 'ready') {
        const { roomId, userId, username } = message;
        
        // Make sure the user is actually in the room with this ID
        if (roomId && rooms.has(roomId) && rooms.get(roomId).has(userId)) {
          console.log(`User ${userId} is ready to connect in room ${roomId}`);
          
          // Notify other participants that this user is ready
          rooms.get(roomId).forEach((participant, participantId) => {
            if (participantId !== userId && participant.ws.readyState === WebSocket.OPEN) {
              participant.ws.send(JSON.stringify({
                type: 'user-ready',
                userId,
                username,
                roomId
              }));
            }
          });
        } else {
          console.log(`Ready message from ${userId} for room ${roomId}, but user not found in room`);
        }
      }
      // Forward any other messages to the room
      else if (message.roomId) {
        const { roomId, userId } = message;
        
        if (roomId && rooms.has(roomId)) {
          rooms.get(roomId).forEach((participant, participantId) => {
            if (participantId !== userId && participant.ws.readyState === WebSocket.OPEN) {
              participant.ws.send(messageData);
            }
          });
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    if (clients.has(ws)) {
      const { roomId, userId } = clients.get(ws);
      handleUserLeaving(ws, roomId, userId);
    }
    
    // Clean up any pending ID updates
    if (pendingIdUpdates.has(ws)) {
      pendingIdUpdates.delete(ws);
    }
  });
  
  // Helper function to complete the join process
  function completeJoin(roomId, userId, username, ws) {
    // Store client info
    clientInfo.roomId = roomId;
    clientInfo.userId = userId;
    clientInfo.username = username || 'Anonymous';
    
    // Store client in clients map
    clients.set(ws, clientInfo);
    
    // Add client to room
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
      // If this is a new room, set this user as the owner
      roomOwners.set(roomId, userId);
    }
    
    // Add client to room with their ID
    rooms.get(roomId).set(userId, {
      ws,
      username: clientInfo.username,
      isOwner: roomOwners.get(roomId) === userId
    });
    
    // Send user list to the new participant
    const roomUsers = Array.from(rooms.get(roomId).entries()).map(([id, user]) => ({
      id,
      username: user.username
    }));
    
    ws.send(JSON.stringify({
      type: 'user-list',
      users: roomUsers,
      roomId
    }));
    
    // Notify other participants about the new user
    rooms.get(roomId).forEach((participant, participantId) => {
      if (participantId !== userId && participant.ws.readyState === WebSocket.OPEN) {
        participant.ws.send(JSON.stringify({
          type: 'join',
          userId,
          username: clientInfo.username,
          roomId
        }));
      }
    });
  }

  // Helper function to handle user leaving
  function handleUserLeaving(ws, roomId, userId) {
    if (roomId && userId && rooms.has(roomId)) {
      // Remove user from room
      rooms.get(roomId).delete(userId);
      
      // Remove from clients map
      clients.delete(ws);
      
      console.log(`User ${userId} left room ${roomId}`);
      
      // Notify other participants
      rooms.get(roomId).forEach((participant) => {
        if (participant.ws.readyState === WebSocket.OPEN) {
          participant.ws.send(JSON.stringify({
            type: 'leave',
            userId,
            roomId
          }));
        }
      });
      
      // Clean up empty rooms
      if (rooms.get(roomId).size === 0) {
        rooms.delete(roomId);
        console.log(`Room ${roomId} deleted (empty)`);
      } else {
        console.log(`Room ${roomId} has ${rooms.get(roomId).size} participants remaining`);
      }
    }
  }
});
