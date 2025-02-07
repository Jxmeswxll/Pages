export async function fetchOrderStatus(orderId) {
  try {
    // Replace with your actual API endpoint
    const response = await fetch(`/api/orders/${orderId}/status`);
    if (!response.ok) throw new Error('Failed to fetch order status');
    return await response.json();
  } catch (error) {
    console.error('Error fetching order status:', error);
    throw error;
  }
}

export async function fetchOrderDetails(orderId) {
  try {
    // Replace with your actual API endpoint
    const response = await fetch(`/api/orders/${orderId}`);
    if (!response.ok) throw new Error('Failed to fetch order details');
    return await response.json();
  } catch (error) {
    console.error('Error fetching order details:', error);
    throw error;
  }
}

export async function getClickUpStatus(taskId) {
  try {
    // Replace with your actual ClickUp API endpoint
    const response = await fetch(`/api/clickup/task/${taskId}`);
    if (!response.ok) throw new Error('Failed to fetch ClickUp status');
    const task = await response.json();
    return task.tags.find(tag => 
      ['ordered', 'picked', 'build', 'test', 'pack', 'shipped']
      .includes(tag.name)
    )?.name;
  } catch (error) {
    console.error('Error fetching ClickUp status:', error);
    throw error;
  }
}
