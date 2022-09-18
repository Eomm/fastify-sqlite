--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

CREATE TABLE Family (
  id   INTEGER PRIMARY KEY,
  name TEXT    NOT NULL
);

CREATE TABLE Person (
  id          INTEGER PRIMARY KEY,
  familyId    INTEGER NOT NULL,
  name        TEXT    NOT NULL,
  nick        TEXT,
  FOREIGN KEY(familyId) REFERENCES Family(id)
);

CREATE INDEX Person_ix_familyId ON Person (familyId);

CREATE TABLE Friend (
  personId    INTEGER NOT NULL,
  friendId    INTEGER NOT NULL,
  isTheBest   NUMERIC NOT NULL DEFAULT 0,
  PRIMARY KEY (personId, friendId),
  CONSTRAINT Friend_ck_isTheBest CHECK (isTheBest IN (0, 1))
);

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

DROP INDEX Person_ix_familyId;
DROP TABLE Friend;
DROP TABLE Person;
DROP TABLE Family;