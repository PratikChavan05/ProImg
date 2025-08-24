import React, { useEffect, useState } from 'react';
import { PinData } from '../context/PinContext';
import { GridLoader } from 'react-spinners';
import PinCard from '../components/PinCard';
import { ImageIcon, Video as VideoIcon } from 'lucide-react';

const Home = () => {
  const { fetchPins, pins, loading } = PinData();
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchPins();
  }, []);

  const filteredPins = pins.filter(pin => {
    if (filter === 'all') {
      return true;
    } else if (filter === 'images') {
      return pin.media?.type === 'image';
    } else if (filter === 'videos') {
      return pin.media?.type === 'video';
    }
    return true;
  });

  const Loading = () => (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <GridLoader size={24} className="text-emerald-500 animate-pulse mb-4" />
      <p className="text-gray-600 font-medium">Loading amazing pins...</p>
    </div>
  );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
        <VideoIcon size={24} className="text-gray-400" /> 
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">No pins yet</h3>
      <p className="text-gray-600 mb-6 max-w-md">
        Start creating your first pin or check back later for new content
      </p>
      <a 
        href="/create" 
        className="px-6 py-3 bg-emerald-600 text-white rounded-full font-medium hover:bg-emerald-700 transition"
      >
        Create Your First Pin
      </a>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6">
      {loading ? (
        <Loading />
      ) : (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-100 mb-4 sm:mb-0">Discover Inspiration</h1>
            
            {/* Responsive Filter buttons */}
            <div className="flex flex-wrap justify-center sm:justify-end gap-2 sm:space-x-2 bg-gray-700 rounded-lg p-1">
              <button 
                onClick={() => setFilter('all')}
                className={`px-3 py-2 sm:px-4 sm:py-2 rounded-md font-medium text-sm transition-colors ${filter === 'all' ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
              >
                All
              </button>
              <button 
                onClick={() => setFilter('images')}
                className={`px-3 py-2 sm:px-4 sm:py-2 rounded-md font-medium text-sm transition-colors flex items-center ${filter === 'images' ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
              >
                <ImageIcon size={16} className="mr-1" />
                Images
              </button>
              <button 
                onClick={() => setFilter('videos')}
                className={`px-3 py-2 sm:px-4 sm:py-2 rounded-md font-medium text-sm transition-colors flex items-center ${filter === 'videos' ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
              >
                <VideoIcon size={16} className="mr-1" />
                Videos
              </button>
            </div>
          </div>
          
          {filteredPins && filteredPins.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredPins.map((pin, i) => (
                <PinCard key={i} pin={pin} />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      )}
    </div>
  );
};

export default Home;