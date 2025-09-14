# Aftershock PC Builder Quiz

This project is an interactive, multi-step quiz designed to help users find the perfect Aftershock PC for their needs. It guides users through a series of questions about their intended use, preferred PC type, favorite games, desired resolution, case size, and budget.

## How it Works

The application is built with HTML, CSS, and vanilla JavaScript.

1.  **Quiz Progression**: The user is presented with a series of questions. The quiz is dynamic, meaning that the questions shown can change based on previous answers. For example, if a user indicates they will be using the PC for gaming, they will be asked about the specific games they play and their target resolution.

2.  **User Selections**: The user makes selections by clicking on interactive cards. The application stores these choices and uses them to determine the next step in the quiz.

3.  **Data Submission**: Once the user has answered all the questions, their selections are compiled into a JSON object and sent to a webhook.

4.  **Fetching Recommendations**: The webhook processes the user's answers and returns a set of PC recommendations, categorized as "Ready to Ship" (RTS) and "Custom Builds".

5.  **Displaying Results**: The application displays the recommended PCs in a responsive grid layout. For mobile devices, the results are shown in a single-card view with swipeable navigation.

## Features

-   **Dynamic Quiz Flow**: The quiz adapts to the user's answers to provide a tailored experience.
-   **Interactive UI**: A clean, modern interface with a dark theme and clear visual feedback for user selections.
-   **Progress Bar**: A visual indicator shows the user how far they have progressed through the quiz.
-   **Perceptual Loader**: An animated loader provides feedback to the user while the PC recommendations are being fetched.
-   **Responsive Design**: The layout and functionality are optimized for both desktop and mobile devices.
-   **Email Results**: Users have the option to have their results emailed to them.

## Files

-   `index.html`: The main HTML file that contains the structure of the quiz and results page.
-   `styles.css`: The stylesheet that defines the visual appearance of the application.
-   `script.js`: The JavaScript file that contains all the logic for the quiz, data submission, and results display.
