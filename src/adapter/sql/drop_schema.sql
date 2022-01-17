CREATE OR REPLACE FUNCTION drop_schema(
    schema text)
  RETURNS void AS
$BODY$

--  This function will clone all sequences, tables, data, views & functions from any existing schema to a new one
-- SAMPLE CALL:
-- SELECT drop_schema('schema');
BEGIN
    EXECUTE 'DROP SCHEMA ' || quote_ident(schema) || ' CASCADE';
    RETURN; 
END;

$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
ALTER FUNCTION drop_schema(text)
  OWNER TO postgres;