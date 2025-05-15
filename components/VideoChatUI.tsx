import React, { useState } from 'react';
import Link from 'next/link';
import { FaQuestionCircle, FaCommentAlt, FaCog, FaTh, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface VideoChatUIProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  inputRoomId: string;
  setInputRoomId: (value: string) => void;
  isJoining: boolean;
}

const VideoChatUI: React.FC<VideoChatUIProps> = ({
  onCreateRoom,
  onJoinRoom,
  inputRoomId,
  setInputRoomId,
  isJoining
}) => {
  // Get current date and time
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const day = now.toLocaleDateString('en-US', { weekday: 'short' });
  const date = now.getDate();
  const month = now.toLocaleDateString('en-US', { month: 'short' });
  
  // State for carousel
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 3;
  
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };
  
  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onJoinRoom();
    }
  };
  
  return (
    <div className="min-h-screen bg-white text-gray-800 flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-3 border-b border-gray-200">
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
          <span className="text-sm text-gray-600 mr-4">{`${hours}:${minutes} • ${day} ${date} ${month}`}</span>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-grow flex flex-col md:flex-row items-center justify-between max-w-7xl mx-auto px-4 py-8 md:py-16">
        <div className="md:w-1/2 mb-8 md:mb-0 md:pr-8">
          <h1 className="text-4xl font-normal text-gray-800 mb-4">Video calls and meetings for everyone</h1>
          <p className="text-lg text-gray-600 mb-8">Connect, collaborate and celebrate from anywhere with Lets Meet</p>
          
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={onCreateRoom}
              className="bg-google-blue hover:bg-google-blue-hover text-white px-4 py-3 rounded-md flex items-center font-medium"
            >
              <svg className="mr-2" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8V16M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              New meeting
            </button>
            
            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden flex-1 max-w-md">
              <div className="pl-3 pr-2 text-gray-500">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <input 
                type="text" 
                placeholder="Enter a code or link" 
                className="py-3 px-2 w-full outline-none text-gray-700"
                value={inputRoomId}
                onChange={(e) => setInputRoomId(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </div>
            
            <button 
              onClick={onJoinRoom}
              disabled={!inputRoomId.trim() || isJoining}
              className={`text-google-blue px-4 py-3 rounded-md font-medium ${
                !inputRoomId.trim() || isJoining 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-blue-50'
              }`}
            >
              {isJoining ? 'Joining...' : 'Join'}
            </button>
          </div>
          
          <div className="mt-12 pt-8 border-t border-gray-200">
            <Link href="#" className="text-google-blue hover:text-google-blue-hover">
              Learn more
            </Link>
            <span className="text-gray-600 ml-1">about Lets Meet</span>
          </div>
        </div>
        
        <div className="md:w-1/2 relative">
          <div className="relative w-full max-w-md mx-auto">
            {/* Carousel navigation */}
            <button 
              onClick={prevSlide} 
              className="absolute left-0 top-1/2 transform -translate-y-1/2 -ml-4 z-10 bg-white rounded-full shadow-md p-2"
              aria-label="Previous slide"
            >
              <FaChevronLeft className="text-gray-600" />
            </button>
            
            <button 
              onClick={nextSlide} 
              className="absolute right-0 top-1/2 transform -translate-y-1/2 -mr-4 z-10 bg-white rounded-full shadow-md p-2"
              aria-label="Next slide"
            >
              <FaChevronRight className="text-gray-600" />
            </button>
            
            {/* Carousel content */}
            <div className="overflow-hidden rounded-xl bg-blue-50 shadow-lg">
              {currentSlide === 0 && (
                <div className="p-6">
                  <div className="bg-google-blue rounded-t-lg p-4"></div>
                  <div className="bg-white p-4 grid grid-cols-7 gap-1">
                    {Array.from({ length: 31 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`aspect-square rounded-sm flex items-center justify-center text-xs ${
                          i === 15 ? 'bg-blue-100 text-blue-800' : 'bg-gray-50'
                        }`}
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 bg-white p-4 rounded-b-lg">
                    <div className="h-4 bg-blue-100 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                  </div>
                </div>
              )}
              
              {currentSlide === 1 && (
                <div className="p-6">
                  <div className="bg-white rounded-lg p-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-100 rounded-lg aspect-video"></div>
                      <div className="bg-green-100 rounded-lg aspect-video"></div>
                      <div className="bg-yellow-100 rounded-lg aspect-video"></div>
                      <div className="bg-red-100 rounded-lg aspect-video"></div>
                    </div>
                    <div className="mt-4 flex justify-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                      <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                      <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                    </div>
                  </div>
                </div>
              )}
              
              {currentSlide === 2 && (
                <div className="p-6">
                  <div className="bg-white rounded-lg p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-100 rounded w-1/3 mb-2"></div>
                        <div className="h-4 bg-gray-100 rounded w-full mb-2"></div>
                        <div className="h-4 bg-gray-100 rounded w-2/3"></div>
                      </div>
                    </div>
                    <div className="mt-6 flex items-start space-x-4">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-100 rounded w-1/4 mb-2"></div>
                        <div className="h-4 bg-gray-100 rounded w-full mb-2"></div>
                        <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Carousel indicators */}
            <div className="flex justify-center mt-4 space-x-2">
              {Array.from({ length: totalSlides }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`w-2 h-2 rounded-full ${
                    currentSlide === i ? 'bg-google-blue' : 'bg-gray-300'
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
            
            {/* Carousel caption */}
            <div className="text-center mt-8">
              <h2 className="text-xl font-medium text-gray-800 mb-2">Plan ahead</h2>
              <p className="text-gray-600">
                Click <span className="font-medium">New meeting</span> to schedule meetings in Google Calendar and send invitations to participants
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VideoChatUI;
