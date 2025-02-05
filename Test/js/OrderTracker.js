const OrderTracker = ({ orderNumber }) => {
    const stages = [
        {
            tag: 'ordered',
            title: 'Order Received',
            description: 'Order has been confirmed',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6 flex-shrink-0" style="width: 24px; height: 24px;"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>`
        },
        {
            tag: 'picked',
            title: 'Items Picked',
            description: 'Components gathered',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6 flex-shrink-0" style="width: 24px; height: 24px;"><path d="M20 6L9 17L4 12" /></svg>`
        },
        {
            tag: 'build',
            title: 'In Production',
            description: 'Building in progress',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6 flex-shrink-0" style="width: 24px; height: 24px;"><path d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>`
        },
        {
            tag: 'test',
            title: 'Testing',
            description: 'Quality assurance',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6 flex-shrink-0" style="width: 24px; height: 24px;"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>`
        },
        {
            tag: 'packed',
            title: 'Packed',
            description: 'Ready for shipping',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6 flex-shrink-0" style="width: 24px; height: 24px;"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>`
        }
    ];

    const order = clickUpOrders[orderNumber];
    const currentStageIndex = stages.findIndex(stage => stage.tag === order.status);

    return (
        <div className="card">
            <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Track Your Order</h2>
                <p className="text-gray-500">Order #{orderNumber}</p>
            </div>

            <div className="relative mb-8">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200">
                    <div 
                        className="h-full bg-blue-500"
                        style={{ width: `${(currentStageIndex / (stages.length - 1)) * 100}%` }}
                    />
                </div>

                <div className="relative flex justify-between">
                    {stages.map((stage, index) => (
                        <div 
                            key={index} 
                            className="flex flex-col items-center"
                            style={{ width: '120px' }}
                        >
                            <div
                                className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 mb-2 ${
                                    index <= currentStageIndex 
                                        ? 'bg-blue-500 border-blue-500 text-white' 
                                        : 'bg-white border-gray-300 text-gray-400'
                                }`}
                                dangerouslySetInnerHTML={{ __html: stage.icon }}
                            />

                            <div className="text-center">
                                <h3 className={`font-semibold text-sm mb-1 ${
                                    index <= currentStageIndex ? 'text-blue-500' : 'text-gray-400'
                                }`}>
                                    {stage.title}
                                </h3>
                                <p className={`text-xs ${
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