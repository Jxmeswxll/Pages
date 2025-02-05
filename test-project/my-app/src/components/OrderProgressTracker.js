import React, { useState } from 'react';
import { Package, Truck, ShoppingCart, Settings } from "lucide-react";

// Simple className combiner
const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

const OrderProgressTracker = () => {
  // Define the possible stages of order progress
  const stages = [
    { 
      key: 'ordered', 
      label: 'Waiting to be Picked', 
      icon: ShoppingCart,
      color: 'bg-gray-300'
    },
    { 
      key: 'picked', 
      label: 'Picked', 
      icon: Package,
      color: 'bg-yellow-300'
    },
    { 
      key: 'build', 
      label: 'Being Built', 
      icon: Settings,
      color: 'bg-blue-300'
    },
    { 
      key: 'test', 
      label: 'Order in Production', 
      icon: Settings,
      color: 'bg-indigo-300'
    },
    { 
      key: 'packed', 
      label: 'Order Packed', 
      icon: Package,
      color: 'bg-green-300'
    },
    { 
      key: 'sent', 
      label: 'Order Shipped', 
      icon: Truck,
      color: 'bg-purple-300'
    }
  ];

  // State to track current stage
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  // Calculate progress percentage
  const progressPercentage = (currentStageIndex / (stages.length - 1)) * 100;

  // Handle stage progression
  const handleStageClick = (index) => {
    setCurrentStageIndex(index);
  };

  const currentStage = stages[currentStageIndex];

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4 text-center">Order Tracking</h2>
      
      {/* Speedometer-like Progress Container */}
      <div className="relative w-full h-20 bg-gray-100 rounded-full overflow-hidden mb-4">
        {/* Progress Bar */}
        <div 
          className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-500" 
          style={{ width: `${progressPercentage}%` }}
        />
        
        {/* Stage Indicators */}
        <div className="absolute inset-0 flex items-center justify-between px-4">
          {stages.map((stage, index) => {
            const StageIcon = stage.icon;
            const isPassed = index <= currentStageIndex;
            
            return (
              <div 
                key={stage.key} 
                onClick={() => handleStageClick(index)}
                className={cn(
                  "z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer",
                  isPassed ? stage.color : "bg-gray-200",
                  "border-4 border-white shadow-md hover:scale-110"
                )}
              >
                <StageIcon 
                  className={cn(
                    "w-6 h-6", 
                    isPassed ? "text-black" : "text-gray-400"
                  )}
                />
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Current Status Text */}
      <div className="text-center">
        <p className="font-semibold text-lg">
          Current Status: {currentStage.label}
        </p>
        
        {/* Additional Stage Details */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center mb-2">
            <currentStage.icon className="w-8 h-8 mr-2" />
            <h3 className="text-lg font-semibold">{currentStage.key.toUpperCase()} Stage</h3>
          </div>
          <p className="text-gray-600">
            {(() => {
              switch(currentStage.key) {
                case 'ordered':
                  return "Your order has been received and is waiting to be picked from our inventory.";
                case 'picked':
                  return "Items have been selected and are ready for the next stage of processing.";
                case 'build':
                  return "Your order is currently being assembled or manufactured.";
                case 'test':
                  return "Quality checks and final production steps are being performed.";
                case 'packed':
                  return "All items have been carefully packed and prepared for shipping.";
                case 'sent':
                  return "Your order is on its way! Tracking information has been generated.";
                default:
                  return "Order status information unavailable.";
              }
            })()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderProgressTracker;
