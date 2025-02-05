import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import OrderTracker from './OrderTracker';
import { clickUpOrders } from './data/orders';

const MemberPortal = () => {
    const { memberId } = useParams();
    const [member, setMember] = useState(null);
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        // Simulating an API call to fetch member data
        const fetchMemberData = async () => {
            // In a real application, you would make an API call here
            // For now, we'll use mock data
            const mockMember = {
                id: memberId,
                name: 'John Doe',
                email: 'john.doe@example.com',
                memberSince: '2022-01-01',
            };
            setMember(mockMember);
        };

        fetchMemberData();
    }, [memberId]);

    useEffect(() => {
        // Simulating an API call to fetch order data
        const fetchOrderData = async () => {
            // In a real application, you would make an API call here
            // For now, we'll use the mock data from clickUpOrders
            const memberOrders = Object.keys(clickUpOrders).filter(
                orderId => clickUpOrders[orderId].memberId === memberId
            );
            setOrders(memberOrders);
        };

        fetchOrderData();
    }, [memberId]);

    if (!member) {
        return <div>Loading...</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Member Portal</h1>
            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <h2 className="text-2xl font-semibold mb-4">Member Information</h2>
                <p><strong>Name:</strong> {member.name}</p>
                <p><strong>Email:</strong> {member.email}</p>
                <p><strong>Member Since:</strong> {member.memberSince}</p>
            </div>
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