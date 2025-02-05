import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import OrderTracker from './OrderTracker';
import { clickUpOrders } from './data/orders';

const MemberPortal = () => {
    const { memberId } = useParams();
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        // Simple order fetching without filtering
        setOrders(Object.keys(clickUpOrders).slice(0, 3)); // Just get first 3 orders for testing
    }, []);

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Member Portal</h1>
            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <h2 className="text-2xl font-semibold mb-4">Your Orders</h2>
                {orders.length > 0 ? (
                    <OrderTracker orders={orders} />
                ) : (
                    <p>No orders found.</p>
                )}
            </div>
        </div>
    );
};

export default MemberPortal;