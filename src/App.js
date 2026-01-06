const { ipcRenderer } = require('electron');
const ParentDashboard = require('./ParentDashboard');
const ChildDashboard = require('./ChildDashboard');
const OnboardingWizard = require('./OnboardingWizard');

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            view: 'child',
            data: null,
            loading: true,
            showLoginModal: false,
            pin: '',
            pinError: '',
            onboardingCompleted: false,
            checkingOnboarding: true
        };
    }

    async componentDidMount() {
        const onboardingCompleted = await ipcRenderer.invoke('get-onboarding-completed');
        if (!onboardingCompleted) {
            this.setState({ checkingOnboarding: false });
            return;
        }
        this.setState({ onboardingCompleted: true, checkingOnboarding: false });
        this.fetchData();
    }

    fetchData = async () => {
        try {
            const ipcCall = this.state.view === 'child' ? 'get-child-data' : 'get-parent-data';
            const data = await ipcRenderer.invoke(ipcCall);
            this.setState({ data, loading: false });
        } catch (error) {
            console.error('Error fetching data:', error);
            this.setState({ loading: false });
        }
    };

    handleSwitchToParent = () => {
        this.setState({ showLoginModal: true });
    };

    handleSwitchToChild = () => {
        this.setState({ view: 'child', showLoginModal: false }, () => this.fetchData());
    };

    handleLogin = async () => {
        try {
            const isValid = await ipcRenderer.invoke('verify-parent-pin', this.state.pin);
            if (isValid) {
                this.setState({ view: 'parent', showLoginModal: false, pin: '', pinError: '' }, () => this.fetchData());
            } else {
                this.setState({ pinError: 'Invalid PIN' });
            }
        } catch (error) {
            console.error('Error verifying PIN:', error);
            this.setState({ pinError: 'Error verifying PIN' });
        }
    };

    handlePinChange = (e) => {
        this.setState({ pin: e.target.value, pinError: '' });
    };

    handleOnboardingComplete = () => {
        this.setState({ onboardingCompleted: true });
        this.fetchData();
    };

    render() {
        const { view, data, loading, showLoginModal, pin, pinError, onboardingCompleted, checkingOnboarding } = this.state;

        if (checkingOnboarding) {
            return React.createElement('div', { className: 'loading' }, 'Loading...');
        }

        if (!onboardingCompleted) {
            return React.createElement(OnboardingWizard, { onComplete: this.handleOnboardingComplete });
        }

        if (loading) {
            return React.createElement('div', { className: 'loading' }, 'Loading...');
        }

        let dashboard;
        if (view === 'child') {
            dashboard = React.createElement(ChildDashboard, { data, onSwitchToParent: this.handleSwitchToParent });
        } else {
            dashboard = React.createElement(ParentDashboard, { data, onSwitchToChild: this.handleSwitchToChild });
        }

        let modal = null;
        if (showLoginModal) {
            modal = React.createElement('div', { className: 'modal-overlay' },
                React.createElement('div', { className: 'modal-content' },
                    React.createElement('div', { className: 'modal-header' },
                        React.createElement('h2', { className: 'modal-title' }, 'Enter Parent PIN'),
                        React.createElement('button', { className: 'modal-close', onClick: () => this.setState({ showLoginModal: false, pin: '', pinError: '' }) }, '×')
                    ),
                    React.createElement('div', { className: 'modal-body' },
                        React.createElement('div', { className: 'form-group' },
                            React.createElement('input', { type: 'password', value: pin, onChange: this.handlePinChange, className: 'form-input', placeholder: 'Enter PIN' }),
                            pinError && React.createElement('p', { className: 'form-error' }, pinError)
                        )
                    ),
                    React.createElement('div', { className: 'modal-footer' },
                        React.createElement('button', { onClick: () => this.setState({ showLoginModal: false, pin: '', pinError: '' }), className: 'btn btn-secondary' }, 'Cancel'),
                        React.createElement('button', { onClick: this.handleLogin, className: 'btn btn-primary' }, 'Login')
                    )
                )
            );
        }

        return React.createElement('div', null, dashboard, modal);
    }
}

ReactDOM.render(React.createElement(App), document.getElementById('root'));