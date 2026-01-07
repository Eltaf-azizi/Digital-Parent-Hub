let ipcRenderer;
try {
  ipcRenderer = require('electron').ipcRenderer;
  console.log('Electron ipcRenderer available');
} catch (e) {
  console.log('Electron not available, running in web mode:', e.message);
  ipcRenderer = null;
}

class OnboardingWizard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            currentStep: 0,
            pin: '',
            pinConfirm: '',
            pinError: ''
        };
    }

    steps = [
        {
            title: 'Welcome to Digital Parent Hub',
            content: React.createElement('div', { className: 'text-center' },
                React.createElement('h2', null, 'Welcome!'),
                React.createElement('p', null, 'Digital Parent Hub is a privacy-first digital well-being app designed to help families monitor and encourage healthy screen time habits.'),
                React.createElement('p', null, 'Let\'s get you set up in just a few steps.')
            )
        },
        {
            title: 'What We Track',
            content: React.createElement('div', null,
                React.createElement('h3', null, 'We Track:'),
                React.createElement('ul', null,
                    React.createElement('li', null, 'Application names (e.g., Chrome, Word, Netflix)'),
                    React.createElement('li', null, 'Assigned categories (Study, Entertainment, Social, etc.)'),
                    React.createElement('li', null, 'Duration of usage for each application')
                ),
                React.createElement('p', null, 'This helps us provide insights into screen time patterns and productivity.')
            )
        },
        {
            title: 'What We Never Track',
            content: React.createElement('div', null,
                React.createElement('h3', null, 'We Never Track:'),
                React.createElement('ul', null,
                    React.createElement('li', null, 'Screen content or what you\'re viewing'),
                    React.createElement('li', null, 'Keystrokes or typing activity'),
                    React.createElement('li', null, 'Messages, emails, or any communication content'),
                    React.createElement('li', null, 'Websites visited (beyond the browser application itself)'),
                    React.createElement('li', null, 'Files accessed or their contents'),
                    React.createElement('li', null, 'Any private or personal information')
                ),
                React.createElement('p', null, 'Your privacy is our top priority. We only track application usage to promote healthy digital habits.')
            )
        },
        {
            title: 'Privacy Policy',
            content: React.createElement('div', { className: 'onboarding-scroll' },
                React.createElement('h3', null, 'Privacy Policy'),
                React.createElement('p', null, 'Digital Parent Hub is committed to protecting your privacy. We collect only the minimum data necessary to provide our digital well-being services.'),
                React.createElement('h4', null, 'Data Collection'),
                React.createElement('p', null, 'We collect information about which applications are used and for how long. This data is stored locally on your device and is encrypted.'),
                React.createElement('h4', null, 'Data Usage'),
                React.createElement('p', null, 'Collected data is used solely to generate reports and insights about screen time habits. It is never shared with third parties.'),
                React.createElement('h4', null, 'Data Security'),
                React.createElement('p', null, 'All data is encrypted using industry-standard encryption. Access to parent features requires a PIN that you set.'),
                React.createElement('h4', null, 'Your Rights'),
                React.createElement('p', null, 'You can export, backup, or delete all your data at any time. You have full control over your information.'),
                React.createElement('h4', null, 'Contact'),
                React.createElement('p', null, 'If you have any questions about this privacy policy, please contact us.')
            )
        },
        {
            title: 'Set Parent PIN',
            content: React.createElement('div', { className: 'text-center' },
                React.createElement('h3', null, 'Set a Parent PIN'),
                React.createElement('p', null, 'Create a 4-digit PIN to secure parent access to settings and reports.'),
                React.createElement('div', { className: 'form-group' },
                    React.createElement('input', {
                        type: 'password',
                        placeholder: 'Enter PIN',
                        value: this.state.pin,
                        onChange: (e) => this.setState({ pin: e.target.value, pinError: '' }),
                        className: 'form-input',
                        maxLength: 4
                    })
                ),
                React.createElement('div', { className: 'form-group' },
                    React.createElement('input', {
                        type: 'password',
                        placeholder: 'Confirm PIN',
                        value: this.state.pinConfirm,
                        onChange: (e) => this.setState({ pinConfirm: e.target.value, pinError: '' }),
                        className: 'form-input',
                        maxLength: 4
                    })
                ),
                this.state.pinError && React.createElement('p', { className: 'form-error' }, this.state.pinError)
            )
        },
        {
            title: 'Setup Complete!',
            content: React.createElement('div', { className: 'text-center' },
                React.createElement('h2', null, 'All Set!'),
                React.createElement('p', null, 'Your Digital Parent Hub is now ready to help monitor and encourage healthy digital habits.'),
                React.createElement('p', null, 'Remember: privacy-first, family-focused, and designed for digital well-being.')
            )
        }
    ];

    nextStep = () => {
        if (this.state.currentStep === 4) { // PIN step
            if (this.state.pin.length !== 4 || isNaN(this.state.pin)) {
                this.setState({ pinError: 'PIN must be 4 digits' });
                return;
            }
            if (this.state.pin !== this.state.pinConfirm) {
                this.setState({ pinError: 'PINs do not match' });
                return;
            }
        }
        if (this.state.currentStep < this.steps.length - 1) {
            this.setState({ currentStep: this.state.currentStep + 1 });
        } else {
            this.completeOnboarding();
        }
    };

    prevStep = () => {
        if (this.state.currentStep > 0) {
            this.setState({ currentStep: this.state.currentStep - 1 });
        }
    };

    completeOnboarding = async () => {
        try {
            await ipcRenderer.invoke('set-parent-pin', this.state.pin);
            await ipcRenderer.invoke('set-onboarding-completed', true);
            this.props.onComplete();
        } catch (error) {
            console.error('Error completing onboarding:', error);
        }
    };

    render() {
        const { currentStep } = this.state;
        const step = this.steps[currentStep];

        return React.createElement('div', { className: 'onboarding-container' },
            React.createElement('div', { className: 'onboarding-card' },
                React.createElement('div', { className: 'onboarding-header' },
                    React.createElement('h1', { className: 'onboarding-title' }, step.title),
                    React.createElement('div', { className: 'onboarding-progress' },
                        React.createElement('div', { className: 'onboarding-progress-bar', style: { width: `${((currentStep + 1) / this.steps.length) * 100}%` } })
                    )
                ),
                React.createElement('div', { className: 'onboarding-body' }, step.content),
                React.createElement('div', { className: 'onboarding-footer' },
                    React.createElement('button', {
                        onClick: this.prevStep,
                        disabled: currentStep === 0,
                        className: `btn ${currentStep === 0 ? 'btn-secondary' : 'btn-secondary'}`
                    }, 'Previous'),
                    React.createElement('button', {
                        onClick: this.nextStep,
                        className: 'btn btn-primary'
                    }, currentStep === this.steps.length - 1 ? 'Finish' : 'Next')
                )
            )
        );
    }
}

module.exports = OnboardingWizard;