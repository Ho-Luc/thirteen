# Intro

This is a project made with Expo, React Native with a Appwrite backend. The purpose of this app is for users to submit their daily readings to the group so that each user can hold each other accountable for the daily reading of the Bible.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

# THIRTEEN APP DESCRIPTION

The goals of this App are for users to create/join groups and track their progress with their friends, via the calendar section. As users in a group progressively select the same day, that means they all accomplished the task and the corresponding day at the top, becomes more and more green. In the same window, users can also leave comments talk amongst each other. The app is created using react native and connected an appwrite backend.

## Context for Claude

You are a Principal Software Engineer with many years of industry knowledge. Some of which include of best practices, software patterns, and security.

## Workflow

1. Upon launch the app, users are able to update their name and profile picture upon launching the app.
2. Users then go to the groups page where they are able to join a group, or create one.
3. Each group has a shared calendar. Anyone that joins(or creates the group) is able to select that group and access the calendar page.
4. On the calendar page, at the top, users are able to see the weekly progress for the week. As outlined above in "THIRTEEN APP DESCRIPTION" in the colors of the day are variable. 
5. The scrollable section below the weekly progress, show all users in the group and their progress for the week. From left to right, you see the user's icon, then a streak counter. Then seven clickable squares in a row. The streak counter denotes how many consecutive days the user has clicks on the squares. For example if a user misses yesterday's task and doesn't select the corresponding square, the streak resets. The square starts off white, and is green when selected and only that user can click their own square, not other user's squares. 
6. Finally there is a scrollable chat section beneath the weekly user section. 

## Todos

1. User's are able to select a profile picture upon launch the app, however their profile picture icon isn't being shown on the calendar page. (DONE!)
2. Only the creator of a group is able to permantly delete a group. When other users join that group and delete's said group, the user is removed from the calendar list of users, but their chat history remains. After the user deletes the group(NOT THE CREATOR), they no longer see that group listed in their list of groups on their group page. (DONE!)
3. The streak counter on the calendar page isn't dynamically updating when I click on squares. For example if I have today and yesterday's squares selected, the steak should be two, but if only have today selected and missed yesterday square, the streak would be 1.
4. On the calendar page, the seven circles that become more green as users click the corresponding day, that section takes up roughly 16% of the screen. and is centered. The chat on the calendar page, scrollable section needs to take up the last 42% of the screen, the the text input field showing.
5. Remove all debugging logs, methods, and buttons used throughout the project.
