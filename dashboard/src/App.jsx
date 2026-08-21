import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ShieldAlert, ShieldCheck, Activity, LayoutDashboard, 
  FileText, Settings, TerminalSquare, Code, Server,
  Cloud, ToggleRight, Save, Shield
} from 'lucide-react';

function App() {
  const [incidents, setIncidents] = useState([]);
  const [rules, setRules] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/v1/incidents');
        setIncidents(response.data.incidents);
      } catch (error) {
        console.error("Error fetching incidents:", error);
      }
    };

    const fetchRules = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/v1/rules');
        setRules(response.data.rules);
      } catch (error) {
        console.error("Error fetching rules:", error);
      }
    };

    fetchIncidents();
    fetchRules();
    
    const interval = setInterval(fetchIncidents, 3000);
    return () => clearInterval(interval);
  }, []);

  const criticalCount = incidents.filter(i => i.severity === 'CRITICAL').length;
  const containedCount = incidents.filter(i => i.status.includes('Contained')).length;

  // --- RENDER DASHBOARD VIEW ---
  const renderDashboard = () => (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight">Security Command Center</h1>
        <p className="text-zinc-500 mt-1">Real-time AWS telemetry and automated containment</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm font-medium text-zinc-500 mb-1">Total Incidents (24h)</p>
            <p className="text-4xl font-bold text-zinc-100">{incidents.length}</p>
          </div>
          <div className="p-4 bg-zinc-800/50 rounded-full">
            <Activity className="text-blue-400" size={24} />
          </div>
        </div>
        
        <div className="bg-zinc-900/50 border border-red-900/30 rounded-xl p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm font-medium text-zinc-500 mb-1">Critical Breaches</p>
            <p className="text-4xl font-bold text-red-400">{criticalCount}</p>
          </div>
          <div className="p-4 bg-red-950/50 rounded-full">
            <ShieldAlert className="text-red-400" size={24} />
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-emerald-900/30 rounded-xl p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm font-medium text-zinc-500 mb-1">Automated Containments</p>
            <p className="text-4xl font-bold text-emerald-400">{containedCount}</p>
          </div>
          <div className="p-4 bg-emerald-950/50 rounded-full">
            <ShieldCheck className="text-emerald-400" size={24} />
          </div>
        </div>
      </div>

      <div className="flex-1 bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden flex flex-col shadow-sm">
        <div className="px-6 py-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/80">
          <h2 className="text-lg font-medium text-zinc-200">Active Incident Feed</h2>
        </div>
        
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900/50 text-zinc-500">
              <tr>
                <th className="px-6 py-4 font-medium tracking-wide">Timestamp</th>
                <th className="px-6 py-4 font-medium tracking-wide">Rule Triggered</th>
                <th className="px-6 py-4 font-medium tracking-wide">Identity & Source IP</th>
                <th className="px-6 py-4 font-medium tracking-wide">Action</th>
                <th className="px-6 py-4 font-medium tracking-wide">Severity</th>
                <th className="px-6 py-4 font-medium tracking-wide text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center">
                      <ShieldCheck size={48} className="text-zinc-700 mb-4" />
                      <p className="text-lg font-medium">Environment Secure</p>
                      <p className="text-sm mt-1">No anomalous AWS activity detected.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                incidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-zinc-300 font-mono text-xs">{new Date(incident.timestamp).toLocaleString(undefined, {
                        hour: '2-digit', minute:'2-digit', second:'2-digit'
                      })}</div>
                      <div className="text-zinc-600 font-mono text-[10px] mt-1">{incident.id}</div>
                    </td>
                    <td className="px-6 py-4 text-zinc-200 font-medium">{incident.rule_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-zinc-200 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-zinc-600"></span>
                        {incident.user}
                      </div>
                      <div className="text-zinc-500 text-xs mt-1 ml-4 font-mono">{incident.source_ip}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-blue-400 bg-blue-400/10 px-2.5 py-1 rounded-md border border-blue-400/20">
                        {incident.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase ${
                        incident.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                        incident.severity === 'HIGH' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                      }`}>
                        {incident.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        incident.status.includes('Contained') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        incident.status.includes('Allowed') ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-zinc-800 text-zinc-300 border-zinc-700'
                      }`}>
                        {incident.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  // --- RENDER RULES VIEW ---
  const renderRules = () => (
    <>
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight">Detection Signatures</h1>
          <p className="text-zinc-500 mt-1">Active YAML threat models currently loaded in the Zero Trust engine</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg text-sm text-zinc-400">
          <Server size={16} />
          <span>{rules.length} Active Rules</span>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {rules.map((rule, idx) => (
          <div key={idx} className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
            <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Code className="text-blue-400" size={20} />
                <h3 className="font-semibold text-zinc-200">{rule.name}</h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${
                rule.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                rule.severity === 'HIGH' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
              }`}>
                {rule.severity} (Priority: {rule.priority})
              </span>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <p className="text-sm text-zinc-400 mb-6">{rule.description}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Event Source</p>
                  <p className="text-sm text-zinc-200 font-mono bg-zinc-950 px-3 py-1.5 rounded border border-zinc-800 inline-block">
                    {rule.event_source}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Risk Score</p>
                  <p className="text-sm text-zinc-200 font-mono">{rule.risk_score} / 100</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Target API Actions</p>
                <div className="flex flex-wrap gap-2">
                  {rule.target_actions?.map(action => (
                    <span key={action} className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded border border-emerald-400/20">
                      {action}
                    </span>
                  ))}
                </div>
              </div>

              {rule.trusted_cidrs && (
                <div className="mt-6 pt-4 border-t border-zinc-800">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Trusted Networks (Allowlist)</p>
                  <div className="flex flex-wrap gap-2">
                    {rule.trusted_cidrs.map(cidr => (
                      <span key={cidr} className="text-xs font-mono text-blue-400 bg-blue-400/10 px-2.5 py-1 rounded border border-blue-400/20">
                        {cidr}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );

  // --- RENDER SETTINGS VIEW ---
  const renderSettings = () => (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight">Platform Settings</h1>
        <p className="text-zinc-500 mt-1">Configure CDR engine parameters and AWS integrations</p>
      </header>

      <div className="max-w-4xl space-y-6">
        
        {/* Engine Configuration */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/80 flex items-center gap-3">
            <Shield className="text-blue-400" size={20} />
            <h2 className="font-semibold text-zinc-200">Detection Engine Configuration</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-200">API Polling Interval</p>
                <p className="text-xs text-zinc-500">How often the frontend fetches new telemetry (in seconds)</p>
              </div>
              <input type="number" defaultValue="3" className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-300 w-24 text-right focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <div className="flex items-center justify-between pt-6 border-t border-zinc-800/50">
              <div>
                <p className="text-sm font-medium text-zinc-200">Automated Containment (AWS Lambda)</p>
                <p className="text-xs text-zinc-500">Allow engine to actively attach Deny-All policies to compromised users</p>
              </div>
              <ToggleRight className="text-emerald-500" size={40} strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* AWS Integration */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/80 flex items-center gap-3">
            <Cloud className="text-amber-400" size={20} />
            <h2 className="font-semibold text-zinc-200">AWS Environment Integration</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Monitored AWS Account ID</label>
              <input type="text" readOnly defaultValue="791316000394" className="bg-zinc-950 border border-zinc-800/50 rounded-lg px-4 py-2 text-sm text-zinc-500 w-full font-mono cursor-not-allowed outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Telemetry SQS Queue URL</label>
              <input type="text" readOnly defaultValue="https://sqs.us-east-1.amazonaws.com/791316000394/cdr-telemetry-queue" className="bg-zinc-950 border border-zinc-800/50 rounded-lg px-4 py-2 text-sm text-zinc-500 w-full font-mono cursor-not-allowed outline-none" />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-4">
          <button className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors">
            <Save size={18} />
            Save Configuration
          </button>
        </div>

      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-300 font-sans overflow-hidden">
      
      {/* Sidebar navigation */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-950/50 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-12 text-zinc-100">
            <TerminalSquare className="text-emerald-400" size={28} />
            <span className="text-xl font-bold tracking-tight">CDR Platform</span>
          </div>
          <nav className="space-y-4">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'dashboard' ? 'text-emerald-400 bg-emerald-400/10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
            >
              <LayoutDashboard size={20} />
              <span className="font-medium">Dashboard</span>
            </button>
            <button 
              onClick={() => setActiveTab('rules')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'rules' ? 'text-emerald-400 bg-emerald-400/10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
            >
              <FileText size={20} />
              <span className="font-medium">Detection Rules</span>
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'settings' ? 'text-emerald-400 bg-emerald-400/10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
            >
              <Settings size={20} />
              <span className="font-medium">Settings</span>
            </button>
          </nav>
        </div>
        <div className="text-xs text-zinc-600 font-mono">
          System Status: <span className="text-emerald-500 font-bold">ONLINE</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-8 overflow-y-auto bg-zinc-950">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'rules' && renderRules()}
        {activeTab === 'settings' && renderSettings()}
      </main>
    </div>
  );
}

export default App;