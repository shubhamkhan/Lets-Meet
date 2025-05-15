# Web Chat Application

A real-time video chat application built with Next.js, WebRTC, and WebSockets.

## Features

- Real-time video and audio communication
- Screen sharing
- Text chat during calls
- Responsive design for all screen sizes
- Cross-device compatibility on local network
- Avatar display when video is turned off
- Mute/unmute audio controls
- Turn on/off video controls

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd web-chat
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

## Running the Application

The application consists of two parts: the Next.js frontend and the WebSocket signaling server.

### 1. Start the Signaling Server

```bash
node server/signalingServer.js
```

This will start the WebSocket server on port 5000.

### 2. Start the Next.js Development Server

In a new terminal window:

```bash
npm run dev
# or
yarn dev
```

This will start the Next.js development server on port 3000.

### 3. Access the Application

Open your browser and navigate to:

```
http://localhost:3000
```

## Using the Application

### Creating a New Meeting

1. Click on "New Meeting" on the home page
2. A new meeting room will be created with a unique ID
3. Share this meeting ID with others to invite them to join

### Joining an Existing Meeting

1. Enter the meeting ID in the input field on the home page
2. Click "Join Meeting"
3. You will be connected to the meeting directly

### During a Meeting

- Use the microphone button to mute/unmute your audio
- Use the camera button to turn on/off your video
- Use the screen share button to share your screen
- Use the chat button to open the chat panel and send messages
- Use the end call button to leave the meeting

## Accessing from Other Devices on Local Network

To access the application from other devices on your local network:

1. Find your computer's local IP address (e.g., 192.168.1.100)
2. On other devices, open a browser and navigate to:
   ```
   http://<your-ip-address>:3000
   ```

## Troubleshooting

- If you encounter connection issues, make sure both the signaling server and Next.js server are running
- Check that your browser has permission to access your camera and microphone
- For screen sharing, you need to use a modern browser that supports the Screen Capture API
- If you can't connect from other devices, check your firewall settings to ensure port 3000 and 5000 are accessible

## License

[MIT](LICENSE)
