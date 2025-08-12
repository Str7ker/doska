export default function Switch({ enabled, setEnabled }) {
    return (
      <button
        type="button"
        onClick={() => setEnabled(!enabled)}
        className={`relative inline-flex w-[34px] h-[18px] items-center justify-start rounded-full transition-colors duration-300 focus:outline-none ${
          enabled ? 'bg-blue-500' : 'bg-gray-300'
        }`}
        style={{ backgroundColor: enabled ? '#3B82F6' : '#D1D5DB' }}
      >
        <span
          className={`inline-block h-[14px] w-[14px] transform rounded-full bg-white transition-transform duration-300 ${
            enabled ? 'translate-x-[16px]' : 'translate-x-[2px]'
          }`}
        />
      </button>
    );
  }