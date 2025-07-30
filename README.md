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

1. Tests
2. Add a small clickable banner to the bottom of app/index.tsx. When a user clicks on the banner, a modal pops up With some lines of text, followed by this bible quote. 2 Corinthians 9:6 "...whoever sows generously will also reap generously. Each of you should give what you have decided in your heat to give, not reluctantly or under compulsion, for God loves a cheerful giver" The modal also has a couple buttons to click on, at the bottom(Stripe, Paypal).
3. When a user creates user profile for the FIRST time, a close-able modal opens up with the following information. "Welcome to Thirteen, an app where followers of Jesus can create/join daily bible reading groups. The goal is that, through community, we all encourage each other to build up a daily habit of sitting with God's word. Make sure to keep the streak and make the day green and mark off on the calendar, whether you did the reading"