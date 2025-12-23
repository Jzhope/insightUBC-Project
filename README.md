# CPSC 310 Project Repository

This repository contains starter code for the class project.
Please keep your repository private.

For information about the project, autotest, and the checkpoints, see the course webpage.

## Configuring your environment

To start using this project, you need to get your development environment configured so that you can build and execute the code.
To do this, follow these steps; the specifics of each step will vary based on your operating system:

1. [Install git](https://git-scm.com/downloads) (v2.X). You should be able to execute `git --version` on the command line after installation is complete.

1. [Install Node (Current)](https://nodejs.org/en/download/) (Current: v24.X), which will also install NPM (you should be able to execute `node --version` and `npm --version` on the command line).

1. [Install Yarn](https://yarnpkg.com/en/docs/install) (1.22.X). You should be able to execute `yarn --version`.

1. Clone your repository by running `git clone REPO_URL` from the command line. You can get the REPO_URL by clicking on the green button on your project repository page on GitHub. Note that due to new department changes you can no longer access private git resources using https and a username and password. You will need to use either [an access token](https://help.github.com/en/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line) or [SSH](https://help.github.com/en/github/authenticating-to-github/adding-a-new-ssh-key-to-your-github-account).

## Project commands

Once your environment is configured you need to further prepare the project's tooling and dependencies.
In the project folder:

1. `yarn install` to download the packages specified in your project's _package.json_ to the _node_modules_ directory.

1. `yarn build` to compile your project. You must run this command after making changes to your TypeScript files. If it does not build locally, AutoTest will not be able to build it. This will also run formatting. _If you would like to enable linting, remove `.disabled` from the `eslint.config.mjs.disabled` file and run `yarn build:lint` instead!_

1. `yarn test` to run the test suite.
   - To run with coverage, run `yarn cover`

1. `yarn prettier:fix` to format your project code.

1. `yarn lint:check` to see lint errors in your project code. You may be able to fix some of them using the `yarn lint:fix` command.

If you are curious, some of these commands are actually shortcuts defined in [package.json -> scripts](./package.json).

## How to Start the Application

Follow these steps to start the server and explore the application's functionality:

### Prerequisites

1. Ensure you have completed the environment setup (see [Configuring your environment](#configuring-your-environment) above).
2. Install project dependencies by running `yarn install` in the project root directory.

### Starting the Backend Server

1. **Build the project** (if you haven't already):

   ```bash
   yarn build
   ```

2. **Start the server**:

   ```bash
   yarn start
   ```

   The server will start on port **4321**. You should see a message indicating "Server started on port 4321" in the terminal.

   The server provides the following REST API endpoints:
   - `GET /` - Health check endpoint
   - `GET /datasets` - List all datasets
   - `PUT /dataset/:id?kind=sections|rooms` - Add a dataset
   - `DELETE /dataset/:id` - Remove a dataset
   - `POST /query` - Execute a query on the datasets

### Accessing the Frontend

The frontend is a static web application located in the `frontend/public/` directory. You have two options to access it:

#### Option 1: Open HTML file directly (Simplest)

1. While the server is running, open the file `frontend/public/index.html` in your web browser.
   - You can do this by double-clicking the file, or
   - Right-click the file and select "Open with" → your preferred browser

2. The frontend will connect to the backend server at `http://localhost:4321`.

#### Option 2: Use a simple HTTP server (Recommended for better compatibility)

If you encounter CORS issues or prefer a more standard approach:

1. **Using Python** (if installed):

   ```bash
   cd frontend/public
   python3 -m http.server 8000
   ```

   Then open `http://localhost:8000` in your browser.

2. **Using Node.js http-server** (if installed globally):
   ```bash
   npx http-server frontend/public -p 8000
   ```
   Then open `http://localhost:8000` in your browser.

### Exploring Application Functionality

Once both the server is running and the frontend is open in your browser, you can:

1. **Manage Datasets** (Datasets tab):
   - **Add a dataset**: Upload a ZIP file containing course sections or room data
     - Dataset ID: A unique identifier (e.g., "ubc")
     - Dataset Kind: Choose "Sections" or "Rooms"
     - Dataset File: Select a ZIP file from your computer
   - **Remove a dataset**: Enter a dataset ID and click "Remove Dataset"
   - **List all datasets**: Click "Refresh List" to see all loaded datasets

2. **Query Data** (Query tab):
   - Enter a query in JSON format in the text area
   - Example query:
     ```json
     {
     	"WHERE": {},
     	"OPTIONS": {
     		"COLUMNS": ["sections_dept", "sections_avg"]
     	}
     }
     ```
   - Click "Execute Query" to run the query and view results

3. **View Insights** (Insights tab):
   - Select a sections dataset from the dropdown
   - View visualizations including:
     - Grade Distribution (Histogram)
     - Average Grade by Department
     - Average Grade per Year

### Stopping the Server

To stop the backend server, press `Ctrl+C` in the terminal where the server is running.

### Troubleshooting

- **Port already in use**: If port 4321 is already in use, you'll need to either:
  - Stop the process using that port, or
  - Modify the port in `src/App.ts` (line 7) and update `frontend/public/app.js` (line 1) to match

- **Frontend can't connect to backend**: Ensure:
  - The backend server is running on port 4321
  - You haven't changed the port in `src/App.ts` without updating `frontend/public/app.js`
  - Your browser allows connections to `localhost:4321`

- **Build errors**: Run `yarn build` to check for TypeScript compilation errors before starting the server.

## Running and testing from an IDE

IntelliJ Ultimate should be automatically configured the first time you open the project (IntelliJ Ultimate is a free download through the [JetBrains student program](https://www.jetbrains.com/community/education/#students/)).

### License

While the readings for this course are licensed using [CC-by-SA](https://creativecommons.org/licenses/by-sa/3.0/), **checkpoint descriptions and implementations are considered private materials**. Please do not post or share your project solutions. We go to considerable lengths to make the project an interesting and useful learning experience for this course. This is a great deal of work, and while future students may be tempted by your solutions, posting them does not do them any real favours. Please be considerate with these private materials and not pass them along to others, make your repos public, or post them to other sites online.
