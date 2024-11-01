import { Module, Container, customElements, ControlElement, Styles, Label, FormatUtils } from '@ijstech/components';
import { IPaymentInfo } from '../interface';
import { STRIPE_CONFIG, STRIPE_LIB_URL, stripeCurrencies } from '../store';
import { textCenterStyle } from './index.css';
const Theme = Styles.Theme.ThemeVars;
declare const window: any;

interface ScomPaymentWidgetStripePaymentElement extends ControlElement {
    payment?: IPaymentInfo;
    payBtnCaption?: string;
    onBack?: () => void;
    onPaymentSuccess?: (status: string) => void;
}

declare global {
    namespace JSX {
        interface IntrinsicElements {
            ['scom-payment-widget--stripe-payment']: ScomPaymentWidgetStripePaymentElement;
        }
    }
}

@customElements('scom-payment-widget--stripe-payment')
export class StripePayment extends Module {
    private _payment: IPaymentInfo;
    private stripe: any;
    private stripeElements: any;
    private clientSecret: string;
    private lbItem: Label;
    private lbAmount: Label;
    public onPaymentSuccess: (status: string) => void;
    public onBack: () => void;

    constructor(parent?: Container, options?: ScomPaymentWidgetStripePaymentElement) {
        super(parent, options);
    }

    set payment(data: IPaymentInfo) {
        this._payment = data;
        this.updateAmount();
    }

    get payment() {
        return this._payment;
    }

    private updateAmount() {
        if (this.payment && this.lbAmount) {
            const { title, amount, currency } = this.payment;
            this.lbItem.caption = title || '';
            this.lbAmount.caption = `${FormatUtils.formatNumber(amount, { decimalFigures: 2 })} ${currency?.toUpperCase()}`;
            this.initStripePayment();
        }
    }

    private async loadLib() {
        if (window.Stripe) return;
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = STRIPE_LIB_URL;
            script.async = true;
            script.onload = () => {
                resolve(true);
            };
            document.head.appendChild(script);
        })
    }

    private async initStripePayment() {
        if (!window.Stripe) {
            await this.loadLib();
        }
        if (window.Stripe) {
            const clientSecret = await this.createPaymentIntent();
            if(!clientSecret) return;
            this.clientSecret = clientSecret;
            console.log('client secret', clientSecret)
            const currency = this.payment.currency?.toLowerCase();
            const stripeCurrency = stripeCurrencies.find(v => v === currency) || 'usd';
            if (this.stripeElements) {
                this.stripeElements.update({
                    currency: stripeCurrency,
                    amount: this.payment.amount,
                });
                return;
            }
            this.stripe = window.Stripe(STRIPE_CONFIG.STRIPE_PUBLISHABLE_KEY);
            this.stripeElements = this.stripe.elements({
                mode: 'payment',
                currency: stripeCurrency,
                amount: this.payment.amount,
            });
            const paymentElement = this.stripeElements.create('payment');
            paymentElement.mount('#pnlStripePaymentForm');
        }
    }

    private async createPaymentIntent(): Promise<string> {
        const response = await fetch('http://localhost:3000/payment-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
        });
        if(response.ok) {
            console.log('response', response);
            const data = await response.json();
            if(data.success) {
                const clientSecret = data.data.clientSecret;
                return clientSecret;
            }
            else return null;
        }
        else return null;
    }

    private async handleStripeCheckoutClick() {
        if (!this.stripe) return;
        this.stripeElements.submit().then((result) => {
            this.stripe.confirmPayment({
                elements: this.stripeElements,
                confirmParams: {
                    return_url: 'https://example.com',
                    payment_method_data: {
                        billing_details: {
                            name: 'Anna Sings',
                            email: 'johnny@example.com'
                        }
                    }
                },
                clientSecret: this.clientSecret
            })
            console.log('stripe result', result);
            if (this.onPaymentSuccess) {
                this.onPaymentSuccess(result);
            }
        })
    }

    private handleBack() {
        if (this.onBack) this.onBack();
    }

    async init() {
        super.init();
        this.onPaymentSuccess = this.getAttribute('onPaymentSuccess', true) || this.onPaymentSuccess;
        this.onBack = this.getAttribute('onBack', true) || this.onBack;
        const payment = this.getAttribute('payment', true);
        if (payment) {
            this.payment = payment;
        }
    }

    render() {
        return <i-stack direction="vertical" gap="1rem" alignItems="center" height="100%">
            <i-stack
                direction="vertical"
                gap="0.5rem"
                justifyContent="center"
                alignItems="center"
                width="100%"
                minHeight={85}
                padding={{ top: '1rem', bottom: '1rem', left: '1rem', right: '1rem' }}
                background={{ color: Theme.colors.primary.main }}
            >
                <i-label id="lbItem" class={textCenterStyle} font={{ size: '0.875rem', color: Theme.text.primary, bold: true }} wordBreak="break-word" />
                <i-label caption="Amount to pay" font={{ size: '0.675rem', bold: true, transform: 'uppercase', color: Theme.text.primary }} />
                <i-label id="lbAmount" font={{ size: '0.875rem', color: Theme.text.primary, bold: true }} />
            </i-stack>
            <i-stack direction="vertical" gap="1rem" width="100%" height="100%" alignItems="center" padding={{ top: '1rem', bottom: '1rem', left: '1rem', right: '1rem' }}>
                <i-stack direction="vertical" id="pnlStripePaymentForm" background={{ color: '#fff' }} border={{ radius: 12 }} padding={{ top: '1rem', left: '1rem', bottom: '2rem', right: '1rem' }} />
                <i-stack direction="horizontal" width="100%" alignItems="center" justifyContent="center" margin={{ top: 'auto' }} gap="1rem" wrap="wrap-reverse">
                    <i-button
                        caption="Back"
                        width="calc(50% - 0.5rem)"
                        maxWidth={180}
                        minWidth={90}
                        padding={{ top: '0.5rem', bottom: '0.5rem', left: '0.75rem', right: '0.75rem' }}
                        font={{ size: '1rem', color: Theme.colors.secondary.contrastText }}
                        background={{ color: Theme.colors.secondary.main }}
                        border={{ radius: 12 }}
                        onClick={this.handleBack}
                    />
                    <i-button
                        caption="Checkout"
                        width="calc(50% - 0.5rem)"
                        maxWidth={180}
                        minWidth={90}
                        padding={{ top: '0.5rem', bottom: '0.5rem', left: '0.75rem', right: '0.75rem' }}
                        font={{ size: '1rem', color: Theme.colors.primary.contrastText }}
                        background={{ color: Theme.colors.primary.main }}
                        border={{ radius: 12 }}
                        onClick={this.handleStripeCheckoutClick}
                    />
                </i-stack>
            </i-stack>
        </i-stack>
    }
}