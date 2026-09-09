import React, { useState } from 'react';
import { Volume2, Volume1, VolumeX, Play } from 'lucide-react';
import { getSoundSettings, setSoundSettings, testNotificationSound } from '../utils/pwa';

const VolumeIcon = ({ enabled, volume }) => {
    if (!enabled || volume <= 0) return <VolumeX className="w-4 h-4" />;
    if (volume < 35) return <Volume1 className="w-4 h-4" />;
    return <Volume2 className="w-4 h-4" />;
};

const NotificationSoundControl = ({ variant = 'light' }) => {
    const [settings, setSettings] = useState(() => getSoundSettings());

    const dark = variant === 'dark';

    const update = (patch) => {
        const next = setSoundSettings(patch);
        setSettings(next);
    };

    return (
        <div className={`px-3 py-3 border-t space-y-2 ${dark ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50/60'}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => update({ enabled: !settings.enabled })}
                        className={`p-1.5 rounded-lg transition-colors ${settings.enabled ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'} ${dark && settings.enabled ? '!bg-indigo-500/20 !text-indigo-300' : ''}`}
                        title={settings.enabled ? 'كتم صوت الإشعارات' : 'تشغيل صوت الإشعارات'}
                    >
                        <VolumeIcon enabled={settings.enabled} volume={settings.volume} />
                    </button>
                    <span className={`text-xs font-bold ${dark ? 'text-gray-200' : 'text-gray-700'}`}>صوت الإشعارات</span>
                </div>
                <button
                    onClick={testNotificationSound}
                    disabled={!settings.enabled || settings.volume <= 0}
                    className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${dark ? 'bg-white/10 text-gray-300 hover:bg-white/20' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    title="تجربة الصوت"
                >
                    <Play className="w-3.5 h-3.5" />
                </button>
            </div>
            <input
                type="range"
                min="0"
                max="100"
                value={settings.enabled ? settings.volume : 0}
                disabled={!settings.enabled}
                onChange={(e) => update({ volume: Number(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer"
                aria-label="مستوى صوت الإشعارات"
            />
        </div>
    );
};

export default NotificationSoundControl;
