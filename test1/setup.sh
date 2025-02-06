mkdir -p order-tracking-system/src/components && cd order-tracking-system && \
npm init -y && \
npm install react react-dom react-scripts lucide-react @testing-library/jest-dom @testing-library/react 
@testing-library/user-event web-vitals gh-pages tailwindcss && \
npx tailwindcss init && \
echo '{
  "name": "order-tracking-system",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@testing-library/jest-dom": "^5.17.0",
    "@testing-library/react": "^13.4.0",
    "@testing-library/user-event": "^13.5.0",
    "lucide-react": "^0.263.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "web-vitals": "^2.1.4"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject",
    "predeploy": "npm run build",
    "deploy": "gh-pages -d build"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "devDependencies": {
    "gh-pages": "^6.0.0",
    "tailwindcss": "^3.3.0"
  }
}' > package.json && \
echo '/** @type {import('\''tailwindcss'\'').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}' > tailwind.config.js && \
echo '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Tracking System</title>
</head>
<body>
    <div id="root"></div>
</body>
</html>' > public/index.html && \
echo 'import React from '\''react'\'';
import ReactDOM from '\''react-dom/client'\'';
import '\''./index.css'\'';
import App from '\''./App'\'';

const root = ReactDOM.createRoot(document.getElementById('\''root'\''));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);' > src/index.js && \
echo '@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, '\''Segoe UI'\'', '\''Roboto'\'', '\''Oxygen'\'',
    '\''Ubuntu'\'', '\''Cantarell'\'', '\''Fira Sans'\'', '\''Droid Sans'\'', '\''Helvetica Neue'\'',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f5f5f5;
}' > src/index.css && \
echo 'import React from '\''react'\'';
import OrderTracker from '\''./components/OrderTracker'\'';

function App() {
  return (
    <div className="min-h-screen py-8 px-4">
      <OrderTracker 
        orderId="ORD001" 
        currentStatus="Order Shipped"
      />
    </div>
  );
}

export default App;' > src/App.js && \
echo 'import React from '\''react'\'';
import { ShoppingCart, Package, Cog, Box, Truck } from '\''lucide-react'\'';

const OrderTracker = ({ orderId, currentStatus }) => {
  const stages = [
    { icon: ShoppingCart, label: '\''Order Received'\'', color: '\''bg-gray-200'\'' },
    { icon: Package, label: '\''Items Picked'\'', color: '\''bg-yellow-300'\'' },
    { icon: Cog, label: '\''In Production'\'', color: '\''bg-blue-200'\'' },
    { icon: Cog, label: '\''Testing'\'', color: '\''bg-purple-200'\'' },
    { icon: Box, label: '\''Order Packed'\'', color: '\''bg-emerald-200'\'' },
    { icon: Truck, label: '\''Shipped'\'', color: '\''bg-pink-200'\'' }
  ];

  return (
    <div className="max-w-3xl mx-auto p-8 bg-white rounded-lg shadow-sm">
      <h1 className="text-2xl font-bold mb-8 text-center">Order Tracking</h1>
      
      <div className="relative mb-12">
        <div className="flex justify-center items-center bg-blue-600 rounded-full p-2 mx-auto w-fit">
          <div className="flex gap-2">
            {stages.map((stage, index) => (
              <div
                key={index}
                className={`${stage.color} rounded-full p-3 flex items-center justify-center transition-all duration-300 
hover:scale-110`}
              >
                <stage.icon size={24} className="text-gray-700" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold mb-2">
          Current Status: {currentStatus}
        </h2>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 text-center shadow-sm">
        <div className="flex justify-center mb-4">
          <Truck className="w-8 h-8 text-gray-700" />
        </div>
        <h3 className="font-semibold text-lg mb-2">SENT Stage</h3>
        <p className="text-gray-600">
          Your order is on its way! Tracking information has been generated.
        </p>
      </div>
    </div>
  );
};

export default OrderTracker;' > src/components/OrderTracker.js && \
echo '.gitignore
node_modules/
build/
.DS_Store' > .gitignore && \
git init && \
npm install
