const MemberPortal = () => {
    const [currentUser, setCurrentUser] = React.useState('USER001');
    
    return (
        <div className="min-h-screen bg-gray-100">
            <header className="header">
                <div className="container">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-900">Member Portal</h1>
                        <div className="flex items-center gap-4">
                            <span className="text-gray-600">Logged in as: {users[currentUser].name}</span>
                            <div className="flex gap-4">
                                {Object.keys(users).map((userId) => (
                                    <button
                                        key={userId}
                                        onClick={() => setCurrentUser(userId)}
                                        className={`button ${
                                            currentUser === userId 
                                                ? 'bg-blue-500 text-white' 
                                                : 'bg-gray-200 text-gray-700'
                                        }`}
                                    >
                                        {users[userId].name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container" style={{ paddingTop: '32px', paddingBottom: '32px' }}>
                <div className="mb-4">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Your Orders</h2>
                </div>
                
                <div>
                    {users[currentUser].orders.map((orderNumber) => (
                        <OrderTracker key={orderNumber} orderNumber={orderNumber} />
                    ))}
                </div>
            </main>
        </div>
    );
};