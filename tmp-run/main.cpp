#include <bits/stdc++.h>
#include <iostream>
#include <vector>
#include <unordered_map>
#include <sstream>
#include <string>
using namespace std;

int main() {
    vector<int> nums;
    string line;

    // Đọc dòng 1
    getline(cin, line);
    stringstream ss(line);

    int x;
    while (ss >> x) {
        nums.push_back(x);
    }

    // Đọc target
    int target;
    cin >> target;

    unordered_map<int, int> mp;

    for (int i = 0; i < nums.size(); i++) {
        int complement = target - nums[i];

        if (mp.count(complement)) {
            cout << mp[complement] << " " << i;
            return 0;
        }

        mp[nums[i]] = i;
    }

    return 0;
}