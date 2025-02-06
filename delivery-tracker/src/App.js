import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

const DeliveryTracker = () => {
  const [deliveries, setDeliveries] = useState([
    { id: 1, status: 'Ordered', date: '2024-03-01', details: 'Your order has been placed' },
    { id: 2, status: 'Preparing', date: '2024-03-02', details: 'Chef is preparing your meal' },
    { id: 3, status: 'On the way', date: '2024-03-03', details: 'Driver is on the way to you' 
},
    { id: 4, status: 'Delivered', date: '2024-03-04', details: 'Order delivered successfully' 
},
  ]);

  const [currentStatus, setCurrentStatus] = useState(0);

  // Simulate delivery status updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStatus((prev) => (prev < deliveries.length - 1 ? prev + 1 : 0));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mt-5">
      <h1 className="text-center mb-4">Delivery Tracking</h1>
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="timeline">
            {deliveries.map((delivery, index) => (
              <div 
                key={delivery.id}
                className={`timeline-step ${index <= currentStatus ? 'active' : ''}`}
              >
                <div className="timeline-content">
                  <div className="circle"></div>
                  <h5 className="mb-1">{delivery.status}</h5>
                  <small className="text-muted">{delivery.date}</small>
                  <p className="mt-2">{delivery.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryTracker;
;
