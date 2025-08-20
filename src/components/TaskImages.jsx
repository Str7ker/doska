// components/TaskImages.jsx
import { useEffect, useRef, useState } from 'react';

export default function TaskImages({
    existing = [],               // [{id, url, position}]
    onChange                     // ({ files, deleteIds, reorder }) -> void
}) {
    const [localExisting, setLocalExisting] = useState(existing.slice(0, 4));
    const [newFiles, setNewFiles] = useState([]); // File[]
    const dropRef = useRef(null);

    useEffect(() => { setLocalExisting(existing.slice(0, 4)); }, [existing]);

    const totalCount = localExisting.length + newFiles.length;

    const emit = (nextExisting, nextNew) => {
        const deleteIds = existing
            .filter(e => !nextExisting.find(x => x.id === e.id))
            .map(e => e.id);

        // позиции пересчитываем по порядку от 0
        const reorder = nextExisting.map((e, idx) => ({ id: e.id, position: idx }));

        onChange?.({
            files: nextNew,
            deleteIds,
            reorder,
        });
    };

    const addFiles = (files) => {
        if (!files?.length) return;
        const allowed = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (!allowed.length) return;

        const free = Math.max(0, 4 - (localExisting.length + newFiles.length));
        const toAdd = allowed.slice(0, free);

        const nextNew = [...newFiles, ...toAdd];
        setNewFiles(nextNew);
        emit(localExisting, nextNew);
    };

    const onDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        addFiles(e.dataTransfer.files);
    };

    const onPaste = (e) => {
        const items = e.clipboardData?.items || [];
        const files = [];
        for (const it of items) {
            if (it.kind === 'file') {
                const f = it.getAsFile();
                if (f && f.type.startsWith('image/')) files.push(f);
            }
        }
        if (files.length) addFiles(files);
    };

    const removeExisting = (id) => {
        const next = localExisting.filter(i => i.id !== id);
        setLocalExisting(next);
        emit(next, newFiles);
    };

    const removeNew = (idx) => {
        const next = newFiles.slice();
        next.splice(idx, 1);
        setNewFiles(next);
        emit(localExisting, next);
    };

    // простая перестановка существующих изображений drag&drop внутри сетки
    const [dragIdx, setDragIdx] = useState(null);
    const onDragStart = (idx) => () => setDragIdx(idx);
    const onDragOver = () => (e) => { e.preventDefault(); };
    const onDropReorder = (idx) => (e) => {
        e.preventDefault();
        if (dragIdx === null || dragIdx === idx) return;
        const next = localExisting.slice();
        const [moved] = next.splice(dragIdx, 1);
        next.splice(idx, 0, moved);
        setLocalExisting(next);
        setDragIdx(null);
        emit(next, newFiles);
    };

    return (
        <div
            ref={dropRef}
            className="rounded-lg border border-[#D8D8D8] p-3"
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={onDrop}
            onPaste={onPaste}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="text-14 text-gray-700">Фото (до 4)</div>
                <div className="text-12 text-gray-500">{totalCount}/4</div>
            </div>

            <div className="grid grid-cols-4 gap-2">
                {/* существующие */}
                {localExisting.map((img, idx) => (
                    <div
                        key={img.id}
                        className="relative group rounded-md overflow-hidden border border-gray bg-[#fafafa]"
                        draggable
                        onDragStart={onDragStart(idx)}
                        onDragOver={onDragOver(idx)}
                        onDrop={onDropReorder(idx)}
                        title="Перетащите для изменения порядка"
                    >
                        <img src={img.url} alt="" className="w-full h-20 object-cover" />
                        <button
                            type="button"
                            onClick={() => removeExisting(img.id)}
                            className="absolute top-1 right-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition"
                        >×</button>
                    </div>
                ))}

                {/* новые (предпросмотр) */}
                {newFiles.map((f, idx) => (
                    <div key={`new-${idx}`} className="relative group rounded-md overflow-hidden border border-gray bg-[#fafafa]">
                        <img src={URL.createObjectURL(f)} alt="" className="w-full h-20 object-cover" />
                        <button
                            type="button"
                            onClick={() => removeNew(idx)}
                            className="absolute top-1 right-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition"
                        >×</button>
                    </div>
                ))}

                {/* пустые слоты */}
                {Array.from({ length: Math.max(0, 4 - totalCount) }).map((_, idx) => (
                    <label key={`slot-${idx}`} className="flex items-center justify-center h-20 border border-dashed border-gray rounded-md text-12 text-gray-500 cursor-pointer bg-white hover:bg-gray/10">
                        + Добавить
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
                        />
                    </label>
                ))}
            </div>

            <p className="mt-2 text-12 text-gray-500">
                Перетащи файлы сюда, нажми «+ Добавить», вставь из буфера (Ctrl+V) или меняй порядок перетаскиванием.
            </p>
        </div>
    );
}
