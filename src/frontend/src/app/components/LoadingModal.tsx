'use client';

interface LoadingModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export default function LoadingModal({ isOpen, onClose }: LoadingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-30 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl p-8 mx-4 max-w-md w-full">
        <div className="text-center">
          {/* Large Spinner */}
          <div className="mx-auto mb-6 w-16 h-16 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
          
          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Processing with AI Model
          </h3>
          
          {/* Description */}
          <p className="text-gray-600 mb-4">
            Analyzing conversation relevance using self-hosted Llama 3.2:1B
          </p>
          
          {/* Time estimate */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-center space-x-2 text-blue-700 text-sm">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span>This may take 30-90 seconds depending on model load</span>
            </div>
          </div>
          
          {/* Additional info */}
          <p className="text-xs text-gray-500">
            Using self-hosted model instead of API to showcase model performance capabilities on smaller locally hosted environments
          </p>
        </div>
      </div>
    </div>
  );
}