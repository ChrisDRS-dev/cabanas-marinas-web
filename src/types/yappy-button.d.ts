declare global {
  namespace JSX {
    interface IntrinsicElements {
      "btn-yappy": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        theme?: string;
        rounded?: string;
      };
    }
  }
}

export {};
