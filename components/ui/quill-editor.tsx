'use client';

// components/ui/quill-editor.tsx
// WYSIWYG editor for editable HTML content (e.g. email template body), with a
// toggle to switch to raw HTML source editing. Ported from tour-backend's
// components/QuillEditor.tsx to keep the same editing experience across apps.

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { Code, Eye } from 'lucide-react';
import 'react-quill-new/dist/quill.snow.css';

// Dynamic import to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] border border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  ),
});

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
}

export default function QuillEditor({
  value,
  onChange,
  placeholder = 'เริ่มพิมพ์เนื้อหาที่นี่...',
  height = '300px',
}: QuillEditorProps) {
  const [isHtmlMode, setIsHtmlMode] = useState(false);

  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ indent: '-1' }, { indent: '+1' }],
        [{ align: [] }],
        ['link'],
        ['blockquote', 'code-block'],
        ['clean'],
      ],
    }),
    []
  );

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'indent',
    'align',
    'link',
    'blockquote',
    'code-block',
  ];

  return (
    <div className="quill-editor-wrapper">
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={() => setIsHtmlMode(!isHtmlMode)}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
            isHtmlMode ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {isHtmlMode ? (
            <>
              <Eye className="w-4 h-4" />
              Visual Editor
            </>
          ) : (
            <>
              <Code className="w-4 h-4" />
              HTML Code
            </>
          )}
        </button>
      </div>

      <style jsx global>{`
        .quill-editor-wrapper .ql-container {
          font-size: 15px;
          font-family: inherit;
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
          border-color: #d1d5db;
        }
        .quill-editor-wrapper .ql-toolbar {
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
          background: #f9fafb;
          border-color: #d1d5db;
        }
        .quill-editor-wrapper .ql-editor {
          min-height: ${height};
        }
        .quill-editor-wrapper .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
        }
        .quill-editor-wrapper .ql-snow .ql-picker {
          color: #374151;
        }
        .quill-editor-wrapper .ql-snow .ql-stroke {
          stroke: #374151;
        }
        .quill-editor-wrapper .ql-snow .ql-fill {
          fill: #374151;
        }
        .quill-editor-wrapper .ql-snow button:hover .ql-stroke,
        .quill-editor-wrapper .ql-snow .ql-picker-label:hover .ql-stroke {
          stroke: #2563eb;
        }
        .quill-editor-wrapper .ql-snow button:hover .ql-fill,
        .quill-editor-wrapper .ql-snow .ql-picker-label:hover .ql-fill {
          fill: #2563eb;
        }
        .quill-editor-wrapper .ql-snow button.ql-active .ql-stroke {
          stroke: #2563eb;
        }
        .quill-editor-wrapper .ql-snow button.ql-active .ql-fill {
          fill: #2563eb;
        }
        .quill-editor-wrapper .html-textarea {
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          font-size: 14px;
          line-height: 1.6;
          tab-size: 2;
        }
      `}</style>

      {isHtmlMode ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="<p>เขียน HTML code ที่นี่...</p>"
          className="html-textarea w-full border border-gray-300 rounded-lg p-4 bg-gray-900 text-green-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ minHeight: height, resize: 'vertical' }}
        />
      ) : (
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
