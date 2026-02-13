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
            checkingOnboarding: true,
            parentSession: false,
            sessionTimeout: null
        };
    }

    async componentDidMount() {
        try {
            const response = await fetch((window.API_BASE || '') + '/api/get-onboarding-completed');
            const onboardingCompleted = await response.json();
            if (!onboardingCompleted) {
                this.setState({ checkingOnboarding: false });
                return;
            }
            this.setState({ onboardingCompleted: true, checkingOnboarding: false });
            this.fetchData();
        } catch (error) {
            console.error('Error checking onboarding:', error);
            this.setState({ checkingOnboarding: false });
        }
    }

    fetchData = async () => {
        try {
            const apiCall = this.state.view === 'child' ? (window.API_BASE || '') + '/api/get-child-data' : (window.API_BASE || '') + '/api/get-parent-data';
            const response = await fetch(apiCall);
            const data = await response.json();
            this.setState({ data, loading: false });
        } catch (error) {
            console.error('Error fetching data:', error);
            this.setState({ loading: false });
        }
    };

    handleSwitchToParent = () => {
        if (this.state.parentSession) {
            this.setState({ view: 'parent' }, () => this.fetchData());
        } else {
            this.setState({ showLoginModal: true });
        }
    };

    handleSwitchToChild = () => {
        this.setState({ view: 'child', parentSession: false }, () => {
            if (this.state.sessionTimeout) {
                clearTimeout(this.state.sessionTimeout);
                this.setState({ sessionTimeout: null });
            }
            this.fetchData();
        });
    };

    handleLogin = async () => {
        try {
            const response = await fetch((window.API_BASE || '') + '/api/verify-parent-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: this.state.pin })
            });
            const isValid = await response.json();
            if (isValid) {
                this.setState({ view: 'parent', showLoginModal: false, pin: '', pinError: '', parentSession: true }, () => this.fetchData());
                if (this.state.sessionTimeout) clearTimeout(this.state.sessionTimeout);
                const timeout = setTimeout(() => {
                    this.setState({ parentSession: false, view: 'child' });
                }, 30 * 60 * 1000);
                this.setState({ sessionTimeout: timeout });
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

// App is rendered from index.html using ReactDOM.createRoot