namespace csw;

using {cuid} from '@sap/cds/common';

entity TypeChecks : cuid {
  type_Boolean     : Boolean;
  type_Int32       : Integer;
  type_Int64       : Integer64;
  type_Decimal     : Decimal(2, 1);
  type_Double      : Double;
  type_Date        : Date;
  type_Time        : Time;
  type_DateTime    : DateTime;
  type_Timestamp   : Timestamp;
  type_String      : String;
  type_Binary      : Binary(100);
  type_LargeBinary : LargeBinary;
  type_LargeString : LargeString;
}

