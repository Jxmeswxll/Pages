// Mock ClickUp data
const clickUpOrders = {
    'ORD001': {
        status: 'ordered',
        tags: ['ordered'],
        customer_id: 'USER001'
    },
    'ORD002': {
        status: 'build',
        tags: ['ordered', 'picked', 'build'],
        customer_id: 'USER001'
    },
    'ORD003': {
        status: 'packed',
        tags: ['ordered', 'picked', 'build', 'test', 'packed'],
        customer_id: 'USER002'
    }
};

// Mock user data
const users = {
    'USER001': {
        name: 'John Smith',
        orders: ['ORD001', 'ORD002']
    },
    'USER002': {
        name: 'Sarah Johnson',
        orders: ['ORD003']
    }
};