interface TemplateItem {
  filename: string;
  fileExtension: string;
  content: string;
  folderName?: string;
  items?: TemplateItem[];
}

interface WebContainerFile {
  file: {
    contents: string | Uint8Array;
  };
}

interface WebContainerDirectory {
  directory: {
    [key: string]: WebContainerFile | WebContainerDirectory;
  };
}

type WebContainerFileSystem = Record<string, WebContainerFile | WebContainerDirectory>;

// Base64 string → Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function transformToWebContainerFormat(
  template: { folderName: string; items: TemplateItem[] }
): WebContainerFileSystem {
  function processItem(item: TemplateItem): WebContainerFile | WebContainerDirectory {
    if (item.folderName && item.items) {
      const directoryContents: WebContainerFileSystem = {};

      item.items.forEach(subItem => {
        const key = subItem.fileExtension
          ? `${subItem.filename}.${subItem.fileExtension}`
          : subItem.folderName!;
        directoryContents[key] = processItem(subItem);
      });

      return { directory: directoryContents };
    } else {
      // Base64 image detect karo
      const isBase64Image = item.content?.startsWith('data:image');

      if (isBase64Image) {
        const base64Data = item.content.split(',')[1];
        return {
          file: {
            contents: base64ToUint8Array(base64Data)
          }
        };
      }

      return {
        file: {
          contents: item.content
        }
      };
    }
  }

  const result: WebContainerFileSystem = {};

  template.items.forEach(item => {
    const key = item.fileExtension
      ? `${item.filename}.${item.fileExtension}`
      : item.folderName!;
    result[key] = processItem(item);
  });

  return result;
}