// typically I'll store the below in something like "typings.d.ts"
// this is because, at least typically, these overrides tend to
// be minimal in nature. You could break them up and Typescript
// will pick them up if you wish.


declare global {
  
    // This is our definition or type for the function.
  
    // If defining a object you might do something like
    // interface IConfig { a: number, b: number }
  
    type Debug = (label: string) => (message: any, ...args: any[]) => void;
  
    // Extend the Global interface for the NodeJS namespace.
    namespace NodeJS {
  
      interface Global {
  
        // Reference our above type, this allows global.debug to be
        // to be defined in our code.
        debug: Debug; 
  
      }
  
    }
    
    // This allows us to simply call debug('some_label')('some debug message')
    // from anywhere in our Node server/application.
    interface cds  {
        env: any
    }
  
  }

  export {}