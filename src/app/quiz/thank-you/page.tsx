
import { CheckCircle } from 'lucide-react';

export default function ThankYouPage() {
    return (
        <div className="flex h-screen w-screen items-center justify-center bg-gray-100 p-4">
            <div className="text-center bg-white p-10 rounded-lg shadow-lg">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
                <h1 className="text-3xl font-bold text-gray-800 mb-4">Thank You!</h1>
                <p className="text-muted-foreground">Your quiz has been submitted successfully.</p>
                <p className="text-muted-foreground">Our HR department will get back to you shortly.</p>
            </div>
        </div>
    );
}
