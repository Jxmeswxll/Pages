const OrderTracker = ({ orderNumber }) => {
    const stages = [
        {
            tag: 'ordered',
            title: 'Order Received',
            description: 'Order has been confirmed',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>`
        },
        {
            tag: 'picked',
            title: 'Items Picked',
            description: 'Components gathered',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
        },
        {
            tag: 'build',
            title: 'In Production',
            description: 'Building in progress',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" /></svg>`
        },
        {
            tag: 'test',
            title: 'Testing',
            description: 'Quality assurance',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>`
        },
        {
            tag: 'packed',
            title: 'Packed',
            description: 'Ready for shipping',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>`
        }
    ];

    const order = clickUpOrders[orderNumber];
    const currentStageIndex = stages.findIndex(stage => stage.tag === order.status);

    return (
        <div className="card p-6">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Track Your Orders</h2>
                <p className="text-gray-500">Order: {orderNumber}</p>
            </div>

            <div className="relative mb-8">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 transform -translate-y-1/2">
                    <div 
                        className="h-full bg-blue-500 transition-all duration-500 ease-in-out"
                        style={{ width: `${(currentStageIndex / (stages.length - 1)) * 100}%` }}
                    />
                </div>

                <div className="relative flex justify-between">
                    {stages.map((stage, index) => (
                        <div 
                            key={index} 
                            className="flex flex-col items-center"
                            style={{ width: '20%' }}
                        >
                            <div
                                className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 mb-4 transition-all duration-500 ${
                                    index <= currentStageIndex 
                                        ? 'bg-blue-500 border-blue-500 text-white' 
                                        : 'bg-white border-gray-300 text-gray-400'
                                }`}
                                dangerouslySetInnerHTML={{ __html: stage.icon }}
                            />

                            <div className="text-center">
                                <h3 className={`font-semibold text-sm mb-1 transition-all duration-500 ${
                                    index <= currentStageIndex ? 'text-blue-500' : 'text-gray-400'
                                }`}>
                                    {stage.title}
                                </h3>
                                <p className={`text-xs transition-all duration-500 ${
                                    index <= currentStageIndex ? 'text-gray-600' : 'text-gray-400'
                                }`}>
                                    {stage.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
