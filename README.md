# KpopIt

## 📃 Introduction

[KpopIt](https://www.kpopit.net/) is a web-based interactive game designed for the global K-pop community. Inspired by Wordle, [KpopIt](https://www.kpopit.net/) adapts deductive reasoning mechanics to South Korean music. It is designed for K-pop fans to test their knowledge of idols, groups, and South Korean music.

At **Midnight (EST)**, the daily idol resets, bringing players a fresh challenge.


By the end of 2025, KpopIt only has the classic game mode, in the future I plan to bring new games though.

## 🧠 Core Gameplay Mechanics

### 1.1 - Classic Mode

The primary feature of [KpopIt](https://www.kpopit.net/) is the Classic Mode, where players are challenged to identify a **Secret** idol of the day. This idol is synchronized for all users worldwide based on the current server date.

### 1.2 - Reset Time

The server reset is currently at Midnight (00:00 EST).

### 1.3 - Feedback Systems

For every guess made by the user, a new grid will appear giving proper feedback based on the idol the user has chosen and the idol of the day.

- Group: Displays both **current and past** idol's group affiliations.

- Company / Label: Highlights **major entertainment** agencies (e.g., SM, HYBE, JYP, YG).

- Nationality: Shows the idol's **nationality (or nationalities)**.

- Debut Year: Shows the idol's **debut year**, a crucial metric for fans to distinguish between different generations of K-pop.

- Height: Shows the idol's height.<br/>
Height will be displayed in centimeters (cm).

- Position(s): Shows the idol's **position(s)** within their group(s).

### Hints

To balance difficulty and optimize player experience, [KpopIt](https://www.kpopit.net/) incorporates a hint system that is progressive and will unlock after a certain number of guesses.

#### First Hint

- **Member Count** <br/>
This hint will be unlocked after 6 guesses and it will reveal the **member count** of the idol's **current** group.<br/>
If the idol is currently a **soloist**, this hint will display **"Soloist"** instead.

- **Group Name** <br/>
This hint will be unlocked after 8 guesses and it will reveal the **current** idol's **group**.

## 🔧 Architecture and Technologies

### 2.1 - Backend

The core logic of [KpopIt](https://www.kpopit.net/) is powered by **Python**, using the **Flask** micro-framework. This was initially chosen for its accessibility and easy integration with other engines.

- **Migration Note**: I am currently planning a transition to **FastAPI** to take advantage of asynchronous request handling and improved performance.

### 2.2 - Database

Currently, [KpopIt](https://www.kpopit.net/) utilizes **SQLite** for data persistence. It was chosen for its simplicity and power, making it the ideal choice for the MVP stage. The database schema is carefully designed to handle complex queries regarding idol attributes while maintaining fast response times.

- **Scalability Note**: Plans are in place to migrate to **PostgreSQL** in the near future to support enterprise-grade backups and higher traffic.

#### 2.3 - Frontend

The frontend was made using **React** with **Typescript** and **VITE**. I'm currently focusing on [KpopIt](https://www.kpopit.net/) optimization on **mobile devices** and specific **browsers** and **React** helped me with this.

#### 2.4 - Data Structure and Logic

- **Synchronization**
<br>
The game's "Daily Reset" logic is handled by a time-based synchronization algorithm. The game uses the EST (Eastern Standard Time) timezone as the global reference to avoid common web application sync issues, ensuring a consistent experience for the K-pop community worldwide.

- **Idol Rotation Algorithm**
<br/>
Our idol selection algorithm is designed for maximum variety. It is designed to ensure a healthy idol rotation. It was created by using exponential weighting system combined with a "fresh vs. frozen" mechanic. This logic tracks how recently an idol has appeared and "freezes" them for a calculated duration, ensuring a healthy rotation that prevents repetitive gameplay and keeps the daily challenge exciting. This allows [KpopIt](https://www.kpopit.net/) to have a balanced and fair idol rotation.

## 🤔 Roadmap and Future Plans

While the Classic mode is currently the heart of [KpopIt](https://www.kpopit.net/), I'm already planning new game modes and I hope to share it with you as soon as possible.

The current roadmap for 2026 includes:

1 - **Blurry Mode**: A visual challenge where users identify idols through pixelated or distorted images.

2 - **User Profiles**: Currently [KpopIt](https://www.kpopit.net/) only uses **Local Storage** to hold users' profiles and stats, but in the future I plan to create an account system, allowing users to track their **streaks** and **wins** accurately.

3 -  **Global / Local Leaderboards**: Introducing a competitive layer for the most dedicated fans.

4 - **Design**: Creating a better and unique K-pop vibe, I plan to re-design [KpopIt](https://www.kpopit.net/) for better visuals and experience.

## 💭 Final Thoughts

[KpopIt](https://www.kpopit.net/) is a project born out of a genuine passion for K-pop culture. It was created for all K-pop fans in the world. As a fan of [Wordle](https://www.nytimes.com/games/wordle/index.html) and K-pop, I decided to merge both genres in a single and unique game.

Thanks for stopping by and have fun playing [KpopIt](https://www.kpopit.net/).

![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![Flask](https://img.shields.io/badge/flask-%23000.svg?style=for-the-badge&logo=flask&logoColor=white)
![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)

Created with ❤️ for K-pop fans worldwide.

