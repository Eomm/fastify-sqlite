--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------
INSERT INTO Family (id, name) VALUES (1, 'Foo');
INSERT INTO Family (id, name) VALUES (2, 'Bar');
INSERT INTO Family (id, name) VALUES (3, 'Baz');

INSERT INTO Person (id, familyId, name) VALUES (1, 1, 'John');
INSERT INTO Person (id, familyId, name) VALUES (2, 1, 'Jakie');
INSERT INTO Person (id, familyId, name) VALUES (3, 1, 'Jessie');

INSERT INTO Person (id, familyId, name) VALUES (4, 2, 'Micky');
INSERT INTO Person (id, familyId, name) VALUES (5, 2, 'Lory');
INSERT INTO Person (id, familyId, name) VALUES (6, 2, 'Sara');
INSERT INTO Person (id, familyId, name) VALUES (7, 2, 'Jenny');

INSERT INTO Person (id, familyId, name) VALUES (8, 3, 'Brian');
INSERT INTO Person (id, familyId, name) VALUES (9, 3, 'Brown');
INSERT INTO Person (id, familyId, name) VALUES (10, 3, 'Fuzzy');

INSERT INTO Friend (personId, friendId, isTheBest) VALUES (1, 8, 0);
INSERT INTO Friend (personId, friendId, isTheBest) VALUES (1, 6, 0);
INSERT INTO Friend (personId, friendId, isTheBest) VALUES (1, 9, 1);

INSERT INTO Friend (personId, friendId, isTheBest) VALUES (2, 4, 0);
INSERT INTO Friend (personId, friendId, isTheBest) VALUES (2, 6, 0);
