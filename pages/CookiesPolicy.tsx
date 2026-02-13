import React from 'react';
import { Cookie, Database, Shield, Settings } from 'lucide-react';
import { PageHeader, Card } from '../components/UI';

const CookiesPolicy: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <PageHeader 
        title="Cookie & Storage Policy" 
        description="How we store data on your device to enhance your laboratory workflow."
      />

      <Card>
        <div className="prose prose-slate max-w-none p-2 sm:p-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-pink-50 rounded-xl">
                <Cookie className="text-pink-500" size={28} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 m-0">What are Cookies?</h2>
          </div>
          <p className="text-slate-600 leading-relaxed mb-8 text-lg">
            Cookies are small text files that are used to store small pieces of information. They are stored on your device when the website is loaded on your browser. These cookies help us make the website function properly, make it more secure, provide better user experience, and understand how the website performs.
          </p>

          <hr className="my-8 border-slate-100" />

          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-50 rounded-xl">
                <Database className="text-blue-500" size={28} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 m-0">How We Use Local Storage</h2>
          </div>
          <p className="text-slate-600 leading-relaxed mb-6">
            Sidlab Tools is primarily a <strong>client-side application</strong>. This means we do not have a backend server that stores your personal calculation data. Instead, we use your browser's <strong>Local Storage</strong> technology to remember your inputs so you don't lose your work if you refresh the page.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-3 text-lg">
                    <Settings size={20} className="text-slate-400" />
                    Preferences
                </h3>
                <p className="text-slate-600 leading-relaxed">We store your preferred units (e.g., mM vs µM) and input values for calculators like Dilution and Molarity so you can pick up where you left off.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-3 text-lg">
                    <Shield size={20} className="text-slate-400" />
                    Admin Settings
                </h3>
                <p className="text-slate-600 leading-relaxed">If you use the Admin panel to upload banners or configure the dashboard, these images are stored locally on your device.</p>
            </div>
          </div>

          <hr className="my-8 border-slate-100" />

          <h2 className="text-xl font-bold text-slate-900 mb-6">Types of Data We Store</h2>
          <ul className="space-y-4 mb-8">
             <li className="flex items-start">
                <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold mr-4 mt-1 shrink-0">1</div>
                <div>
                    <span className="font-bold text-slate-800 text-lg">Essential Data</span>
                    <p className="text-slate-600 mt-1">Calculator inputs (C1, V1, Mass, etc.) to prevent data loss on page refresh.</p>
                </div>
             </li>
             <li className="flex items-start">
                <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold mr-4 mt-1 shrink-0">2</div>
                <div>
                    <span className="font-bold text-slate-800 text-lg">Configuration</span>
                    <p className="text-slate-600 mt-1">Banner ad images (if configured) and acceptance of this cookie policy.</p>
                </div>
             </li>
          </ul>

          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 text-blue-800 text-sm leading-relaxed flex gap-4">
             <div className="shrink-0 mt-1">
                <Shield size={20} className="text-blue-500" />
             </div>
             <div>
                <strong className="block text-base mb-1 text-blue-900">Privacy Note</strong>
                Since this data lives in your browser, we (the developers) cannot see, access, or sell your calculation data. It remains strictly on your device. Clearing your browser cache will reset all tools to their default state.
             </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CookiesPolicy;