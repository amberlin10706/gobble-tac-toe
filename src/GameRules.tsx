import {useState} from 'react';

interface GameRulesProps {
}

export default function GameRules() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 rounded font-bold mt-2"
        onClick={() => setOpen(true)}
      >
        📘 How to Play
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[400px] p-6 relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-2 right-3 text-gray-500 hover:text-black text-lg"
            >
              ✕
            </button>

            <h2 className="text-xl font-bold mb-4 text-center">玩法說明</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-800 text-base leading-relaxed">
              <li>玩家輪流出手，橘色旗子先。</li>
              <li>每次只能拖動自己的旗子。</li>
              <li>旗子只能放在空格上或比自己小的旗子上。</li>
              <li>最先連線者獲勝！</li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
