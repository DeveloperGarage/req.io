## REQ.IO

REQ.IO is a simple native desktop HTTP client created with Electron, Vite, and React for testing APIs locally and experimenting with different HTTP requests.

### Getting started with REQ.IO

To start REQ.IO locally, clone the repository:

```bash
git clone https://github.com/kannananil/req.io.git
cd req.io
```

Install dependencies:

```bash
yarn install --dev
```

Once the dependencies are installed, you can start REQ.IO by running the following command:

```bash
yarn dev
```

This will start the REQ.IO application in a new window.

### Building REQ.IO

To build REQ.IO for production, run the following command:

```bash
yarn build
```

This will create a new directory called `dist` which contains the built REQ.IO application.

### Preview built version in browser

To preview the built version of the application and debug in browser by running the following command:

```bash
yarn preview
```

Once the preview server started press `o` to open the preview

Note: This only works after the build command

### Unit testing REQ.IO
To run the unit tests for the application, run the following command:
```
yarn test
```

### Security

REQ.IO implements comprehensive Electron security best practices including IPC validation, Content Security Policy, navigation guards, and minimal API surface exposure. See [SECURITY.md](SECURITY.md) for detailed information about our security architecture and threat model.

### Trivy Vulnerability Scanning
This project uses [Trivy](https://github.com/aquasecurity/trivy) integrated into the Github Actions pipeline to ensure dependency and container security.

#### CI Integration

- The Github Actions pipeline automatically runs a Trivy vulnerability scan on each commit.
- The scan fails the CI build if **High** or **Critical** vulnerabilities are detected.
- Scan results are visible directly in the CI job logs and stored as artifacts (`trivy-report.json`).
- Trivy Ignore (.trivyignore) support:
    - Certain vulnerabilities that are acknowledged but not relevant can be ignored using a .trivyignore file at the project root.
    - Example: add the CVE IDs you want to ignore, one per line:
        - CVE-2023-1234
        - CVE-2023-5678

#### Local Testing

You can also run Trivy locally before committing:

```bash
# Install Trivy
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sudo sh

# Run a local filesystem scan
trivy fs --severity HIGH,CRITICAL .
```

### Interested to contribute?
Please see our  [Contribution Guide](./CONTRIBUTING.md) on how you can get started. Thank you for your valuable time and interest to contribute to this project.

### Contributors

<a href="https://github.com/req-io/req.io/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=req-io/req.io&max=50" />
</a>
