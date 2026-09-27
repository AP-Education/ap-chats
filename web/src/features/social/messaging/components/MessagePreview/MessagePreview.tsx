import ReactMarkdown from 'react-markdown';

export function MessagePreview({ markdown }: { markdown: string | null }) {
  if (markdown === null) return <>Повідомлення видалено</>;

  return (
    <ReactMarkdown
      allowedElements={['p', 'strong', 'em', 'code', 'a', 'br']}
      unwrapDisallowed
      components={{
        p: ({ children }) => <span>{children} </span>,
        a: ({ children }) => <span>{children}</span>,
        br: () => <> </>,
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
