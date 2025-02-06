import { OrderTracker } from './js/OrderTracker.js';
import { fetchOrderDetails, fetchOrderStatus, getClickUpStatus } from './js/api.js';

class OrderTrackerApp {
  constructor(orderId) {
    this.orderId = orderId;
    this.tracker = null;
    this.polling = null;
  }

  async initialize() {
    try {
      // Fetch initial order details
      const orderDetails = await fetchOrderDetails(this.orderId);
      
      // Update order number and estimated delivery
      document.getElementById('orderNumberDisplay').textContent = orderDetails.