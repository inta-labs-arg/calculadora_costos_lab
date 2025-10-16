declare module "html2pdf.js" {
  type Html2PdfMargin = number | [number, number] | [number, number, number, number];

  interface Html2PdfImageOptions {
    type?: string;
    quality?: number;
  }

  interface Html2CanvasOptions {
    scale?: number;
    useCORS?: boolean;
  }

  interface JsPdfOptions {
    unit?: string;
    format?: string | number[];
    orientation?: "portrait" | "landscape";
  }

  interface Html2PdfOptions {
    margin?: Html2PdfMargin;
    filename?: string;
    image?: Html2PdfImageOptions;
    html2canvas?: Html2CanvasOptions;
    jsPDF?: JsPdfOptions;
  }

  interface Html2PdfInstance {
    set: (options: Html2PdfOptions) => Html2PdfInstance;
    from: (element: HTMLElement) => Html2PdfInstance;
    save: () => Promise<void>;
  }

  interface Html2PdfStatic {
    (): Html2PdfInstance;
  }

  const html2pdf: Html2PdfStatic;
  export default html2pdf;
}
