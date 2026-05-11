pipeline {
    agent any

    environment {
        HEADLESS = 'true'
        RECORD_VIDEO = 'true'
        NOTIFY = 'true'
        BUILD_ID = "${env.BUILD_NUMBER}"
        BUILD_URL = "${env.BUILD_URL}"
        // When Jenkins archives the reports/ folder, links resolve under this base
        REPORT_BASE_URL = "${env.BUILD_URL}artifact/reports"
    }

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {

        stage('Install Dependencies') {
            steps {
                dir('C:\\Playwright_E2E') {
                    bat 'npm ci'
                }
            }
        }

        stage('Install Playwright Browsers') {
            steps {
                dir('C:\\Playwright_E2E') {
                    bat 'npx playwright install --with-deps chromium'
                }
            }
        }

        stage('Run Smoke Tests') {
            steps {
                dir('C:\\Playwright_E2E') {
                    script {
                        try {
                            bat 'npm run test:smoke'
                        } catch (err) {
                            currentBuild.result = 'UNSTABLE'
                            echo "Smoke tests reported failures: ${err.getMessage()}"
                        }
                    }
                }
            }
        }

        stage('Generate Report') {
            steps {
                dir('C:\\Playwright_E2E') {
                    bat 'npm run report'
                }
            }
        }
    }

    post {
        always {
            publishHTML(target: [
                allowMissing         : true,
                alwaysLinkToLastBuild: true,
                keepAll              : true,
                reportDir            : 'C:\\Playwright_E2E\\reports',
                reportFiles          : 'execution-summary.html,cucumber-report.html',
                reportName           : 'E2E Execution Report'
            ])

            archiveArtifacts(
                artifacts         : 'reports/**/*',
                allowEmptyArchive : true
            )
        }

        success {
            echo '✅ Smoke tests passed successfully.'
        }

        unstable {
            echo '⚠️  One or more smoke tests failed. Check the Cucumber report for details.'
        }

        failure {
            echo '❌ Pipeline failed. Review the console output for errors.'
        }
    }
}
