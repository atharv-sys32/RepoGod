import React, { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Bell, Shield, Palette, Code2, User } from 'lucide-react';

type Section = 'profile' | 'appearance' | 'api' | 'notifications' | 'security';

const sections: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <User size={16} /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
  { id: 'api', label: 'API Keys', icon: <Code2 size={16} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
  { id: 'security', label: 'Security', icon: <Shield size={16} /> },
];

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise((r) => setTimeout(r, 800));
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex h-full">
      {/* Settings Nav */}
      <nav className="w-48 border-r border-gray-800 bg-gray-950 p-3 space-y-0.5">
        <p className="text-xs font-medium text-gray-600 uppercase tracking-wider px-3 py-2">
          Settings
        </p>
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
              activeSection === s.id
                ? 'bg-indigo-600/20 text-indigo-300'
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
            }`}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8 max-w-2xl">
        {activeSection === 'profile' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-100 mb-1">
              Profile Settings
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Manage your account details and preferences.
            </p>

            <div className="space-y-5">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-indigo-700 flex items-center justify-center text-xl font-bold text-white">
                  {displayName?.slice(0, 2).toUpperCase() || 'RG'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">
                    Profile picture
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Avatar support coming soon.
                  </p>
                </div>
              </div>

              <Input
                label="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">Email</label>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-gray-400 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 flex-1">
                    {user?.email}
                  </p>
                  <Badge variant="success" size="sm">Verified</Badge>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleSave}
                  isLoading={isSaving}
                  variant={saved ? 'secondary' : 'primary'}
                >
                  {saved ? 'Saved!' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'appearance' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-100 mb-1">
              Appearance
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Customize how RepoGod looks.
            </p>
            <Card>
              <p className="text-sm text-gray-400">
                Theme customization is coming soon. Currently using dark mode.
              </p>
            </Card>
          </div>
        )}

        {activeSection === 'api' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-100 mb-1">
              API Keys
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Manage API keys for external integrations.
            </p>
            <Card>
              <p className="text-sm text-gray-400">
                API key management is coming soon.
              </p>
            </Card>
          </div>
        )}

        {activeSection === 'notifications' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-100 mb-1">
              Notifications
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Configure when and how you receive notifications.
            </p>
            <div className="space-y-3">
              {[
                { label: 'Indexing complete', desc: 'When a repository finishes indexing' },
                { label: 'Long tasks complete', desc: 'When AI analysis completes' },
                { label: 'Error alerts', desc: 'When something goes wrong' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-200">
                      {item.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-9 h-5 bg-gray-700 peer-checked:bg-indigo-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'security' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-100 mb-1">
              Security
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Manage your password and security settings.
            </p>
            <div className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                placeholder="••••••••"
              />
              <Input
                label="New Password"
                type="password"
                placeholder="••••••••"
              />
              <Input
                label="Confirm New Password"
                type="password"
                placeholder="••••••••"
              />
              <Button variant="primary">Update Password</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
